import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ClassroomDetail } from "@/components/ClassroomDetail";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ClassroomDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();

  const classroom = await db.classroom.findUnique({
    where: { id },
    include: {
      students: { orderBy: { createdAt: "asc" } },
      boards: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!classroom || classroom.teacherId !== user.id) {
    notFound();
  }

  // Fetch all boards owned by teacher (for board picker)
  const teacherMemberships = await db.boardMember.findMany({
    where: { userId: user.id, role: "owner" },
    include: { board: true },
  });
  const allBoards = teacherMemberships.map((m) => ({
    id: m.board.id,
    slug: m.board.slug,
    title: m.board.title,
    layout: m.board.layout,
  }));

  const serialized = {
    id: classroom.id,
    name: classroom.name,
    code: classroom.code,
    students: classroom.students.map((s) => ({
      id: s.id,
      name: s.name,
      qrToken: s.qrToken,
      textCode: s.textCode,
      createdAt: s.createdAt.toISOString(),
    })),
    boards: classroom.boards.map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      layout: b.layout,
    })),
  };

  return (
    <main className="classroom-page">
      <a href="/classroom" className="classroom-back-link">
        &larr; 학급 목록
      </a>
      <ClassroomDetail classroom={serialized} allBoards={allBoards} />
    </main>
  );
}
