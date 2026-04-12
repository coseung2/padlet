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

  // Classroom + teacher's owned-board list are independent — run in parallel.
  const [classroom, teacherMemberships] = await Promise.all([
    db.classroom.findUnique({
      where: { id },
      include: {
        students: { orderBy: [{ number: "asc" }, { createdAt: "asc" }] },
        boards: { orderBy: { createdAt: "desc" } },
      },
    }),
    db.boardMember.findMany({
      where: { userId: user.id, role: "owner" },
      include: { board: true },
    }),
  ]);

  if (!classroom || classroom.teacherId !== user.id) {
    notFound();
  }
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
      number: s.number,
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
