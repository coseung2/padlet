/**
 * GET /api/external/whoami
 *
 * Lightweight endpoint for the Canva Content Publisher app to check whether
 * the student is currently logged into Aura in the same browser. Used to:
 *   • show "작성자: 가온 ✓" banner in the app
 *   • decide whether to render the "Aura 로그인하기" button
 *
 * Auth is cookie-based (student_session). PAT is NOT required here — the
 * student can check their own status without the teacher's token ever being
 * handed out.
 */
import { NextResponse } from "next/server";
import { getCurrentStudent } from "@/lib/student-auth";

export const runtime = "nodejs";

export async function GET() {
  const student = await getCurrentStudent();
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
