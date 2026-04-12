/**
 * GET /api/external/boards
 *
 * Returns the list of boards the PAT owner can write to (owner/editor role).
 * Used by the Aura Canva app to populate a "보드 선택" dropdown so students
 * never type board IDs by hand.
 *
 * Pipeline:
 *   1. PAT verify (prefix O(1) + timing-safe) → 401/410
 *   2. Scope check cards:write → 403
 *   3. Tier dual-defense (Free → 402)
 *   4. 3-axis rate limit (token/teacher/ip) → 429
 *   5. 200 { boards: [{ id, slug, title, layout, role }] }
 *     — intersected with `scopeBoardIds` when the token restricts boards.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPat } from "@/lib/external-pat";
import { checkAll as rateLimitCheck } from "@/lib/rate-limit";
import { requireProTier, TierRequiredError } from "@/lib/tier";
import { externalErrorResponse } from "@/lib/external-errors";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function GET(req: Request) {
  const verified = await verifyPat(req.headers.get("authorization"));
  if (!verified.ok) return externalErrorResponse(verified.code);
  const { user, tokenId, scopes, scopeBoardIds } = verified.value;

  if (!scopes.includes("cards:write")) {
    return externalErrorResponse("forbidden_scope");
  }

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

  const gate = await rateLimitCheck({ tokenId, userId: user.id, req });
  if (!gate.ok) {
    return externalErrorResponse("rate_limited", undefined, {
      "Retry-After": String(gate.retryAfter),
      "X-Rate-Limit-Axis": gate.axis ?? "unknown",
    });
  }

  const memberships = await db.boardMember.findMany({
    where: {
      userId: user.id,
      role: { in: ["owner", "editor"] },
      ...(scopeBoardIds.length > 0 ? { boardId: { in: scopeBoardIds } } : {}),
    },
    include: {
      board: {
        select: { id: true, slug: true, title: true, layout: true },
      },
    },
    orderBy: { board: { title: "asc" } },
  });

  const boards = memberships.map((m) => ({
    id: m.board.id,
    slug: m.board.slug,
    title: m.board.title || "(제목 없음)",
    layout: m.board.layout,
    role: m.role,
  }));

  return NextResponse.json({ boards });
}
