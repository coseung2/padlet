/**
 * POST /api/external/cards
 *
 * External card creation endpoint for the Content-Publisher integration (P0-②).
 * Authenticated via Personal Access Token in `Authorization: Bearer …` header.
 *
 * Contract: see docs/external-api.md
 */
import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { verifyToken, checkRateLimit } from "@/lib/external-auth";

// Keep runtime default (Node) — Prisma + optional @vercel/blob dynamic import.
export const runtime = "nodejs";

const CreateExternalCardSchema = z
  .object({
    boardId: z.string().min(1),
    sectionId: z.string().min(1).nullable().optional(),
    title: z.string().min(1).max(200),
    content: z.string().max(5000).optional().default(""),
    imageDataUrl: z.string().optional(),
    linkUrl: z.string().url().optional(),
    canvaDesignId: z.string().min(1).optional(),
  })
  .strict();

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB decoded
const DATA_URL_RE = /^data:image\/png;base64,([A-Za-z0-9+/=_-]+)$/;

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ success: false, error: code, message }, { status });
}

async function storeImageFromDataUrl(
  dataUrl: string
): Promise<{ url: string } | { error: string; status: number }> {
  const m = DATA_URL_RE.exec(dataUrl);
  if (!m) return { error: "unsupported_image_type", status: 400 };
  let buffer: Buffer;
  try {
    buffer = Buffer.from(m[1], "base64");
  } catch {
    return { error: "invalid_base64", status: 400 };
  }
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    return { error: "image_too_large", status: 413 };
  }
  const filename = `ext-${Date.now()}-${randomBytes(4).toString("hex")}.png`;

  // Prefer Vercel Blob when configured; otherwise fall back to /public/uploads/.
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobToken) {
    // Dynamic import via a runtime-computed specifier so TS doesn't require
    // @vercel/blob to be installed at typecheck time. Optional dep.
    const blobSpecifier = ["@vercel", "blob"].join("/");
    try {
      const mod = (await import(/* webpackIgnore: true */ blobSpecifier).catch(
        () => null
      )) as { put?: (k: string, v: Buffer, o: unknown) => Promise<{ url: string }> } | null;
      if (mod && typeof mod.put === "function") {
        const result = await mod.put(`external/${filename}`, buffer, {
          access: "public",
          contentType: "image/png",
          token: blobToken,
        });
        return { url: result.url };
      }
      console.warn("[external/cards] BLOB_READ_WRITE_TOKEN set but @vercel/blob not installed; TODO: install");
    } catch (e) {
      console.warn("[external/cards] blob put failed, falling back to fs", e);
    }
  }

  // Filesystem fallback (dev / self-hosted).
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadDir, filename);
  try {
    await writeFile(filePath, buffer);
  } catch (e) {
    console.error("[external/cards] fs write failed", e);
    return { error: "image_store_failed", status: 500 };
  }
  return { url: `/uploads/${filename}` };
}

export async function POST(req: Request) {
  // 1) Bearer auth
  const authHeader = req.headers.get("authorization");
  const verified = await verifyToken(authHeader);
  if (!verified) {
    return jsonError("unauthorized", "Missing or invalid Authorization bearer token", 401);
  }
  const { user, tokenId } = verified;

  // 2) Rate limit (per token, 60/min)
  const gate = checkRateLimit(tokenId);
  if (!gate.ok) {
    return NextResponse.json(
      { success: false, error: "rate_limited", retryAfter: gate.retryAfter },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter) } }
    );
  }

  // 3) Body parse + zod validate
  let bodyRaw: unknown;
  try {
    bodyRaw = await req.json();
  } catch {
    return jsonError("invalid_json", "Request body must be JSON", 400);
  }
  let input: z.infer<typeof CreateExternalCardSchema>;
  try {
    input = CreateExternalCardSchema.parse(bodyRaw);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "validation_failed", issues: e.issues },
        { status: 400 }
      );
    }
    throw e;
  }

  // 4) Board existence + RBAC (viewer/non-member -> 403; absent -> 404)
  const board = await db.board.findUnique({
    where: { id: input.boardId },
    select: { id: true, slug: true },
  });
  if (!board) return jsonError("board_not_found", "Board does not exist", 404);

  try {
    await requirePermission(board.id, user.id, "edit");
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return jsonError("forbidden", "Token user cannot edit this board", 403);
    }
    throw e;
  }

  // 5) sectionId must belong to boardId
  if (input.sectionId) {
    const sec = await db.section.findUnique({
      where: { id: input.sectionId },
      select: { id: true, boardId: true },
    });
    if (!sec || sec.boardId !== board.id) {
      return jsonError("section_mismatch", "sectionId does not belong to boardId", 400);
    }
  }

  // 6) Optional image
  let imageUrl: string | null = null;
  if (input.imageDataUrl) {
    const res = await storeImageFromDataUrl(input.imageDataUrl);
    if ("error" in res) return jsonError(res.error, res.error, res.status);
    imageUrl = res.url;
  }

  // 7) Optional Canva link (best-effort oEmbed enrichment)
  let linkUrl: string | null = input.linkUrl ?? null;
  let linkTitle: string | null = null;
  let linkImage: string | null = null;
  let linkDesc: string | null = null;
  if (input.canvaDesignId) {
    linkUrl = `https://www.canva.com/design/${input.canvaDesignId}/view`;
    try {
      const { resolveCanvaEmbedUrl } = await import("@/lib/canva");
      const embed = await resolveCanvaEmbedUrl(linkUrl);
      if (embed) {
        linkUrl = `https://www.canva.com/design/${embed.designId}/view`;
        linkImage = embed.thumbnailUrl;
        linkTitle = embed.title;
        linkDesc = embed.authorName ? `by ${embed.authorName}` : null;
      }
    } catch (e) {
      console.warn("[external/cards] canva oEmbed enrichment failed (non-fatal)", e);
    }
  }

  // 8) Create card
  const card = await db.card.create({
    data: {
      boardId: board.id,
      authorId: user.id,
      title: input.title,
      content: input.content ?? "",
      imageUrl,
      linkUrl,
      linkTitle,
      linkImage,
      linkDesc,
      x: 0,
      y: 0,
      width: 240,
      height: 160,
      order: 0,
      sectionId: input.sectionId ?? null,
    },
    select: { id: true },
  });

  return NextResponse.json({
    success: true,
    cardId: card.id,
    cardUrl: `/board/${board.slug}?card=${card.id}`,
  });
}
