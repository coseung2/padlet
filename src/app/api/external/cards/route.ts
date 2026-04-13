/**
 * POST /api/external/cards — Canva Publisher receiver endpoint (Seed 8 CR-4).
 *
 * Pipeline:
 *   1. Content-Length hard guard (4MB) → 413
 *   2. PAT verify (prefix O(1) + timing-safe) → 401/410
 *   3. Scope check cards:write → 403
 *   4. Tier dual-defense (Free → 402)
 *   5. 3-axis Upstash rate limit (token/teacher/ip, OR) → 429
 *   6. Zod strict body parse → 422
 *   7. scopeBoardIds allowlist → 403
 *   8. RBAC owner/editor on board → 403, board missing → 404
 *   9. sectionId must belong to board → 422
 *  10. Streaming Blob upload (multipart) → 500 on failure
 *  11. Card INSERT (defaults width=240 height=160 content="" authorId=token.user)
 *  12. 200 { id, url: https://aura-board-app.vercel.app/board/<slug>#c/<cardId> }
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { verifyBearer } from "@/lib/external-auth";
import { checkAll as rateLimitCheck } from "@/lib/rate-limit";
import { uploadPngFromDataUrl, BlobUploadError } from "@/lib/blob";
import { requireProTier, TierRequiredError } from "@/lib/tier";
import { externalErrorResponse } from "@/lib/external-errors";
import { extractCanvaDesignId } from "@/lib/canva";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY_BYTES = 4 * 1024 * 1024; // 4.0 MB hard guard (Vercel 4.5MB ceiling)

const CARD_URL_BASE =
  process.env.NEXT_PUBLIC_APP_BASE_URL?.replace(/\/$/, "") ??
  "https://aura-board-app.vercel.app";

// Zod strict body schema per Seed 8 §1.6 — 4 fields, unknown = 422.
// Using z.string().min(1) for boardId/sectionId (cuid-ish; SQLite lacks the
// cuid1 guarantee but the runtime still validates presence + DB existence).
const BodySchema = z
  .object({
    boardId: z.string().min(1).max(40),
    title: z.string().min(1).max(200),
    imageDataUrl: z
      .string()
      .regex(/^data:image\/png;base64,/, "imageDataUrl must be a data:image/png;base64, URL"),
    sectionId: z.string().min(1).max(40).nullable().optional(),
    // Canva design URL of the source — when supplied, the card is wired
    // for CanvaEmbedSlot's thumbnail+live toggle UX.
    canvaDesignUrl: z.string().url().max(500).optional(),
  })
  .strict();

export async function POST(req: Request) {
  // [1] Content-Length hard guard (before body parse).
  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return externalErrorResponse("payload_too_large");
  }

  // [2] Bearer verify — PAT or student OAuth token.
  const authHeader = req.headers.get("authorization");
  const verified = await verifyBearer(authHeader);
  if (!verified.ok) {
    // 401 for format/invalid_token, 410 for revoked/expired.
    return externalErrorResponse(verified.code);
  }
  const { user, tokenId, tokenPrefix, scopes, scopeBoardIds, kind } = verified;

  // [3] Scope gate.
  if (!scopes.includes("cards:write")) {
    return externalErrorResponse("forbidden_scope");
  }

  // [4] Tier dual-defense (R7).
  try {
    requireProTier(user.id);
  } catch (e) {
    if (e instanceof TierRequiredError) {
      return externalErrorResponse("tier_required", undefined, {
        "X-Upgrade-Url": e.upgradeUrl,
      });
    }
    throw e;
  }

  // [5] 3-axis rate limit.
  const gate = await rateLimitCheck({ tokenId, userId: user.id, req });
  if (!gate.ok) {
    return externalErrorResponse("rate_limited", undefined, {
      "Retry-After": String(gate.retryAfter),
      "X-Rate-Limit-Axis": gate.axis ?? "unknown",
    });
  }

  // [6] Body parse + strict zod.
  let bodyRaw: unknown;
  try {
    bodyRaw = await req.json();
  } catch {
    return externalErrorResponse("invalid_data_url", "Request body must be JSON");
  }
  const parsed = BodySchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return externalErrorResponse(
      "invalid_data_url",
      parsed.error.issues[0]?.message ?? "Zod strict validation failed"
    );
  }
  const input = parsed.data;

  // Defensive: clamp decoded size. base64 encodes 3 bytes → 4 chars, so a
  // 4MB body can yield ~3MB PNG. We recheck the decoded buffer in blob.ts,
  // but a quick length check here saves a decode round-trip for obvious
  // violations beyond content-length (e.g. chunked requests).
  const approxBytes = Math.floor((input.imageDataUrl.length - "data:image/png;base64,".length) * 0.75);
  if (approxBytes > MAX_BODY_BYTES) {
    return externalErrorResponse("payload_too_large");
  }

  // [7] scopeBoardIds allowlist check.
  if (scopeBoardIds.length > 0 && !scopeBoardIds.includes(input.boardId)) {
    return externalErrorResponse("forbidden_board");
  }

  // [8] Board + RBAC.
  const board = await db.board.findUnique({
    where: { id: input.boardId },
    select: { id: true, slug: true },
  });
  if (!board) return externalErrorResponse("not_found");
  try {
    await requirePermission(board.id, user.id, "edit");
  } catch (e) {
    if (e instanceof ForbiddenError) return externalErrorResponse("forbidden");
    throw e;
  }

  // [9] sectionId membership if provided.
  if (input.sectionId) {
    const sec = await db.section.findUnique({
      where: { id: input.sectionId },
      select: { id: true, boardId: true },
    });
    if (!sec || sec.boardId !== board.id) {
      return externalErrorResponse(
        "invalid_data_url",
        "sectionId does not belong to boardId"
      );
    }
  }

  // [9.5] REQUIRED: student attribution.
  //   - OAuth path: bearer token is already student-scoped → use it directly.
  //   - PAT path: fall back to the student_session cookie (existing rule).
  // Either way, the student's classroom must match the target board's.
  let studentAuthorId: string | null = null;
  let externalAuthorName: string | null = null;
  let studentClassroomId: string;
  try {
    if (kind === "oauth") {
      studentAuthorId = verified.student.id;
      externalAuthorName = verified.student.name;
      studentClassroomId = verified.student.classroomId;
    } else {
      const { getCurrentStudent } = await import("@/lib/student-auth");
      const student = await getCurrentStudent();
      if (!student) {
        return externalErrorResponse(
          "student_session_required",
          "Aura 학생 로그인이 필요해요. 학생 계정으로 로그인한 뒤 다시 시도하세요."
        );
      }
      studentAuthorId = student.id;
      externalAuthorName = student.name;
      studentClassroomId = student.classroomId;
    }

    const boardForClassroom = await db.board.findUnique({
      where: { id: board.id },
      select: { classroomId: true },
    });
    if (
      boardForClassroom?.classroomId &&
      boardForClassroom.classroomId !== studentClassroomId
    ) {
      return externalErrorResponse(
        "forbidden",
        "학생의 학급이 보드 학급과 달라요."
      );
    }
  } catch (e) {
    console.error("[POST /api/external/cards] student auth", e);
    return externalErrorResponse("internal");
  }

  // [10+11] Atomically (best-effort): create the card first with null
  // imageUrl so we can key the blob path by cardId, then upload, then
  // update. On upload failure, we delete the empty card to avoid orphans.
  const canvaDesignId = input.canvaDesignUrl
    ? extractCanvaDesignId(input.canvaDesignUrl)
    : null;
  const card = await db.card.create({
    data: {
      boardId: board.id,
      authorId: user.id,
      studentAuthorId,
      title: input.title,
      content: "",
      imageUrl: null,
      externalAuthorName,
      canvaDesignId,
      // When a Canva design URL is supplied, populate linkUrl/linkTitle so
      // CardAttachments' canRenderCanvaEmbed gate (canvaDesignId &&
      // linkImage) can fire once linkImage is set to the blob PNG below.
      linkUrl: input.canvaDesignUrl ?? null,
      linkTitle: input.canvaDesignUrl ? input.title : null,
      x: 0,
      y: 0,
      width: 240,
      height: 160,
      order: 0,
      sectionId: input.sectionId ?? null,
    },
    select: { id: true },
  });

  let blobUrl: string;
  try {
    const res = await uploadPngFromDataUrl(
      input.imageDataUrl,
      `external-cards/${board.id}/${card.id}.png`
    );
    blobUrl = res.url;
  } catch (e) {
    // Rollback empty card.
    await db.card.delete({ where: { id: card.id } }).catch(() => void 0);
    if (e instanceof BlobUploadError) {
      return externalErrorResponse("blob_upload_failed");
    }
    console.error("[POST /api/external/cards] upload", e);
    return externalErrorResponse("internal");
  }

  // For Canva-published cards, the blob PNG doubles as the thumbnail
  // (linkImage) so CanvaEmbedSlot activates. For legacy image-only cards,
  // imageUrl is the only field set.
  await db.card.update({
    where: { id: card.id },
    data: input.canvaDesignUrl
      ? { linkImage: blobUrl }
      : { imageUrl: blobUrl },
  });

  // Audit: we already touched lastUsedAt in verifyPat; nothing else to do.
  void tokenPrefix; // silence unused-var

  // [12] Minimal response.
  return NextResponse.json(
    {
      id: card.id,
      url: `${CARD_URL_BASE}/board/${board.slug}#c/${card.id}`,
    },
    { status: 200 }
  );
}
