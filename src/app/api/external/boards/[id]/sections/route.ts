/**
 * GET /api/external/boards/[id]/sections
 *
 * Returns sections of a board so the Canva Content Publisher app can populate
 * a "섹션 선택" dropdown before the student publishes a design. Matches the PAT
 * auth + Pro tier + rate-limit pipeline from /api/external/cards but is
 * read-only so no body guard / Blob.
 *
 * Pipeline:
 *   1. PAT verify (prefix O(1) + timing-safe) → 401/410
 *   2. Tier dual-defense (Free → 402)
 *   3. 3-axis rate limit (token/teacher/ip) → 429
 *   4. scopeBoardIds allowlist → 403
 *   5. RBAC owner/editor on board → 403, board missing → 404
 *   6. 200 { sections: [{id, title, order, role?}] }
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { verifyPat } from "@/lib/external-pat";
import { checkAll as rateLimitCheck } from "@/lib/rate-limit";
import { requireProTier, TierRequiredError } from "@/lib/tier";
import { externalErrorResponse } from "@/lib/external-errors";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: boardId } = await params;

  // [1] PAT verify.
  const verified = await verifyPat(req.headers.get("authorization"));
  if (!verified.ok) return externalErrorResponse(verified.code);
  const { user, tokenId, scopes, scopeBoardIds } = verified.value;

  // [2] Scope gate — reuse cards:write scope; listing sections is a subset
  // of the write flow so we don't define a separate read scope in v1.
  if (!scopes.includes("cards:write")) {
    return externalErrorResponse("forbidden_scope");
  }

  // [3] Tier dual-defense.
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

  // [4] Rate limit (same 3-axis).
  const gate = await rateLimitCheck({ tokenId, userId: user.id, req });
  if (!gate.ok) {
    return externalErrorResponse("rate_limited", undefined, {
      "Retry-After": String(gate.retryAfter),
      "X-Rate-Limit-Axis": gate.axis ?? "unknown",
    });
  }

  // [5] scopeBoardIds allowlist.
  if (scopeBoardIds.length > 0 && !scopeBoardIds.includes(boardId)) {
    return externalErrorResponse("forbidden_board");
  }

  // [6] Board existence + RBAC.
  const board = await db.board.findUnique({
    where: { id: boardId },
    select: { id: true, slug: true, layout: true, title: true },
  });
  if (!board) return externalErrorResponse("not_found");

  try {
    await requirePermission(boardId, user.id, "edit");
  } catch (e) {
    if (e instanceof ForbiddenError) return externalErrorResponse("forbidden");
    throw e;
  }

  const sections = await db.section.findMany({
    where: { boardId },
    orderBy: { order: "asc" },
    select: { id: true, title: true, order: true },
  });

  return NextResponse.json({
    board: { id: board.id, slug: board.slug, title: board.title, layout: board.layout },
    sections,
  });
}
