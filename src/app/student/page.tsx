import { getCurrentStudent } from "@/lib/student-auth";
import { db } from "@/lib/db";
import { StudentDashboard } from "@/components/StudentDashboard";
import { redirect } from "next/navigation";

export default async function StudentPage() {
  const student = await getCurrentStudent();

  if (!student) {
    redirect("/student/login");
  }

  const boards = await db.board.findMany({
    where: { classroomId: student.classroomId },
    include: {
      quizzes: {
        select: { roomCode: true, status: true },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const boardItems = boards.map((b) => ({
    id: b.id,
    slug: b.slug,
    title: b.title || "제목 없음",
    layout: b.layout,
    quizzes: b.quizzes,
  }));

  return (
    <main className="student-page">
      <StudentDashboard
        studentName={student.name}
        classroomName={student.classroom.name}
        boards={boardItems}
      />
    </main>
  );
}
