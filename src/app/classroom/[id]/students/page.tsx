import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ClassroomDetail } from "@/components/ClassroomDetail";
import { ClassroomNav } from "@/components/classroom/ClassroomNav";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ClassroomStudentsPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();

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

  const classroomBoardIds = classroom.boards.map((b) => b.id);
  const latestCards = classroomBoardIds.length
    ? await db.card.groupBy({
        by: ["boardId"],
        where: { boardId: { in: classroomBoardIds } },
        _max: { createdAt: true },
      })
    : [];
  const latestActivityByBoard = new Map<string, Date>(
    latestCards.flatMap((c) =>
      c._max.createdAt ? [[c.boardId, c._max.createdAt] as const] : []
    )
  );

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
      updatedAt: (latestActivityByBoard.get(b.id) ?? b.createdAt).toISOString(),
    })),
  };

  return (
    <main className="classroom-page classroom-page-detail">
      <a href="/classroom" className="classroom-back-link">
        &larr; 학급 목록
      </a>
      <ClassroomNav classroomId={classroom.id} />
      <ClassroomDetail classroom={serialized} allBoards={allBoards} />
    </main>
  );
}
