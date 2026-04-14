/**
 * GET /api/external/whoami
 *
 * Lightweight endpoint for the Canva app to check which Aura-board
 * student the current session is bound to. Accepts:
 *   - student_session cookie (same-browser web flow),
 *   - student OAuth access token (`aurastu_...`) via Authorization: Bearer,
 *   - Canva Apps SDK user token (JWT) via Authorization: Bearer — resolved
 *     through the CanvaAppLink mapping populated at OAuth consent time.
 *
 * Returns 200 with the student payload when logged in, or 401 with a
 * short code the client can branch on.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentStudent } from "@/lib/student-auth";
import { verifyAccessToken } from "@/lib/oauth-server";
import { verifyCanvaToken, looksLikeCanvaJwt } from "@/lib/canva-jwt";

export const runtime = "nodejs";

async function studentFromBearer(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();

  // aurastu_ — classic OAuth access token path.
  if (token.startsWith("aurastu_")) {
    const r = await verifyAccessToken(token);
    if (!r.ok) return null;
    return db.student.findUnique({
      where: { id: r.studentId },
      include: { classroom: true },
    });
  }

  // Canva Apps SDK JWT — verify signature then look up the linked student.
  if (looksLikeCanvaJwt(token)) {
    let claims;
    try {
      claims = await verifyCanvaToken(token);
    } catch {
      return null;
    }
    const link = await db.canvaAppLink.findUnique({
      where: { canvaUserId: claims.canvaUserId },
      include: { student: { include: { classroom: true } } },
    });
    return link?.student ?? null;
  }

  return null;
}

export async function GET(req: Request) {
  const student =
    (await studentFromBearer(req.headers.get("authorization"))) ??
    (await getCurrentStudent());

  if (!student) {
    return NextResponse.json(
      { error: { code: "student_session_required", message: "Not logged in" } },
      { status: 401 },
    );
  }
  return NextResponse.json({
    student: {
      id: student.id,
      name: student.name,
      classroomId: student.classroomId,
      classroomName: student.classroom?.name ?? null,
    },
  });
}
