/**
 * GET /api/external/whoami
 *
 * Lightweight endpoint for the Canva Content Publisher app to check whether
 * the student is currently authenticated to Aura. Accepts EITHER:
 *   - the legacy student_session cookie (same-browser flow), or
 *   - a student OAuth access token via `Authorization: Bearer aurastu_...`
 *     once the app has completed the /oauth/token exchange.
 *
 * Used to render "작성자: 가온 ✓" in the app or surface an "Aura 로그인하기"
 * button otherwise.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentStudent } from "@/lib/student-auth";
import { verifyAccessToken } from "@/lib/oauth-server";

export const runtime = "nodejs";

async function studentFromBearer(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token.startsWith("aurastu_")) return null;
  const r = await verifyAccessToken(token);
  if (!r.ok) return null;
  return db.student.findUnique({
    where: { id: r.studentId },
    include: { classroom: true },
  });
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
