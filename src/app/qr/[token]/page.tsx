import { createStudentSession } from "@/lib/student-auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function QRLandingPage({ params }: Props) {
  const { token } = await params;

  const student = await db.student.findUnique({
    where: { qrToken: token },
    include: { classroom: true },
  });

  if (student) {
    await createStudentSession(student.id, student.classroomId);
    redirect("/student");
  }

  // Token not found — show error UI
  return (
    <div className="student-qr-landing">
      <div className="student-qr-error">
        <h2>QR 코드를 인식할 수 없습니다</h2>
        <p>
          유효하지 않거나 만료된 QR 코드입니다.
          선생님께 새 QR 코드를 요청하거나 텍스트 코드로 로그인하세요.
        </p>
        <a href="/student/login" className="student-login-btn">
          코드로 로그인
        </a>
      </div>
    </div>
  );
}
