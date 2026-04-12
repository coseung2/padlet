/**
 * GET  /api/tokens — list current user's PATs (prefix + metadata only).
 * POST /api/tokens — issue a new PAT. Full `aurapat_...` returned ONCE.
 *
 * Seed 8 CR-3. Replaces the legacy `/api/account/tokens` surface; the old
 * route remains behind the hood but now delegates here. Dual-defense tier
 * gate (Free → 402 + upgrade URL) per CR-5.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  issuePat,
  listTokens,
  TOKEN_CAP_PER_USER,
} from "@/lib/external-pat";
import { requireProTier, TierRequiredError } from "@/lib/tier";
import { externalErrorResponse } from "@/lib/external-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IssueSchema = z
  .object({
    name: z.string().min(1).max(100),
    scopes: z.array(z.string()).optional(),
    scopeBoardIds: z.array(z.string()).optional(),
    expiresInDays: z.union([z.number().int().positive(), z.null()]).optional(),
  })
  .strict();

export async function GET() {
  const user = await getCurrentUser();
  const rows = await listTokens(user.id);
  return NextResponse.json({
    tokens: rows.map((r) => ({
      id: r.id,
      name: r.name,
      tokenPrefix: r.tokenPrefix,
      scopes: r.scopes,
      scopeBoardIds: r.scopeBoardIds,
      createdAt: r.createdAt.toISOString(),
      lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
      revokedAt: r.revokedAt?.toISOString() ?? null,
      expiresAt: r.expiresAt?.toISOString() ?? null,
    })),
    cap: TOKEN_CAP_PER_USER,
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();

  // Dual-defense: Free tier cannot issue cards:write (CR-5).
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

  let bodyRaw: unknown;
  try {
    bodyRaw = await req.json();
  } catch {
    return externalErrorResponse("invalid_data_url", "Request body must be JSON");
  }
  const parsed = IssueSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return externalErrorResponse(
      "invalid_data_url",
      parsed.error.issues[0]?.message ?? "Validation failed"
    );
  }
  try {
    const out = await issuePat({
      userId: user.id,
      name: parsed.data.name,
      scopes: parsed.data.scopes,
      scopeBoardIds: parsed.data.scopeBoardIds,
      expiresInDays: parsed.data.expiresInDays,
    });
    return NextResponse.json({
      id: out.id,
      prefix: out.prefix,
      token: out.fullToken, // 1-time exposure
      createdAt: out.createdAt.toISOString(),
      expiresAt: out.expiresAt?.toISOString() ?? null,
    });
  } catch (e) {
    const code = (e as Error & { code?: string }).code;
    if (code === "token_limit_exceeded") {
      return externalErrorResponse(
        "token_limit_exceeded",
        `Maximum ${TOKEN_CAP_PER_USER} active tokens reached — revoke an existing token first`
      );
    }
    if (code === "invalid_name") {
      return externalErrorResponse("invalid_data_url", "Label must be 1–100 chars");
    }
    if (code === "invalid_scope") {
      return externalErrorResponse("forbidden_scope", "Only cards:write is supported in v1");
    }
    console.error("[POST /api/tokens]", e);
    return externalErrorResponse("internal");
  }
}
