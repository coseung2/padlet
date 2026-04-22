/**
 * GET /api/external/boards
 *
 * Returns the list of boards the PAT owner can write to (owner/editor role),
 * further restricted to the boards that belong to the **currently logged-in
 * student's classroom**. Dual-gate (PAT + student_session) mirrors the pattern
 * established in POST /api/external/cards so the Canva app cannot leak other
 * classrooms' boards by swapping its session.
 *
 * Pipeline:
 *   1. PAT verify (prefix O(1) + timing-safe) → 401/410
 *   2. Scope check cards:write → 403
 *   3. Tier dual-defense (Free → 402)
 *   4. 3-axis rate limit (token/teacher/ip) → 429
 *   5. student_session required → 401 student_session_required
 *   6. 200 { boards: [{ id, slug, title, layout, role }] }
 *     — intersected with `scopeBoardIds` when the token restricts boards
 *     — restricted to `board.classroomId === session.classroomId`.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyBearer } from "@/lib/external-auth";
import { checkAll as rateLimitCheck } from "@/lib/rate-limit";
import { requireProTierAsync, TierRequiredError } from "@/lib/tier";
import { externalErrorResponse } from "@/lib/external-errors";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function GET(req: Request) {
  const verified = await verifyBearer(req.headers.get("authorization"));
  if (!verified.ok) return externalErrorResponse(verified.code);
  const { user, tokenId, scopes, scopeBoardIds, kind } = verified;

  if (!scopes.includes("cards:write")) {
    return externalErrorResponse("forbidden_scope");
  }

  try {
    await requireProTierAsync(user.id);
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

  // Determine classroom scoping:
  //   - OAuth: token is student-scoped → use verified.student.classroomId.
  //   - PAT: student_session cookie is required (existing dual-gate).
  let classroomId: string;
  if (kind === "oauth") {
    classroomId = verified.student.classroomId;
  } else {
    const { getCurrentStudent } = await import("@/lib/student-auth");
    const student = await getCurrentStudent();
    if (!student) {
      return externalErrorResponse(
        "student_session_required",
        "Aura 학생 로그인이 필요해요."
      );
    }
    classroomId = student.classroomId;
  }

  const memberships = await db.boardMember.findMany({
    where: {
      userId: user.id,
      role: { in: ["owner", "editor"] },
      board: { classroomId },
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
