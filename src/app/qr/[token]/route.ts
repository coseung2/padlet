/**
 * GET /qr/[token]
 *
 * 학생이 출력된 QR 코드를 스캔했을 때의 랜딩. Next.js 15 이후
 * Server Component 에서는 `cookies().set()` 호출이 금지돼서 이전의
 * `page.tsx` 구현이 500 을 뱉었다. 이제는 Route Handler 로 전환해
 * 쿠키 설정 → 302 redirect 만 수행한다.
 *
 * 유효 토큰:  createStudentSession → 302 /student
 * 무효 토큰:  302 /qr/invalid (안내 페이지)
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createStudentSession } from "@/lib/student-auth";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const student = await db.student.findUnique({
    where: { qrToken: token },
    select: { id: true, classroomId: true },
  });

  if (!student) {
    return NextResponse.redirect(
      new URL("/qr/invalid", _req.url),
      { status: 302 }
    );
  }

  await createStudentSession(student.id, student.classroomId);
  return NextResponse.redirect(new URL("/student", _req.url), {
    status: 302,
  });
}
