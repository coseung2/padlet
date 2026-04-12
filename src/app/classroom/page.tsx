import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ClassroomListPage } from "@/components/ClassroomListPage";
import { redirect } from "next/navigation";

export default async function ClassroomPage() {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    redirect("/login");
  }

  const classrooms = await db.classroom.findMany({
    where: { teacherId: user.id },
    include: {
      _count: { select: { students: true, boards: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="classroom-page">
      <a href="/" className="classroom-back-link">
        &larr; 대시보드
      </a>
      <div className="classroom-header">
        <h1>학급 관리</h1>
      </div>
      <ClassroomListPage initialClassrooms={classrooms} />
    </main>
  );
}
