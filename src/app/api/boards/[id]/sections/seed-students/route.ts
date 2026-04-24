import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { touchBoardUpdatedAt } from "@/lib/board-touch";

// POST /api/boards/:id/sections/seed-students
// columns 보드에서 교사가 명시적으로 누르는 옵션. 보드의 classroom 학생을
// 출석번호 순으로 가져와 섹션을 한 번에 만든다. 기존 섹션이 있으면 그
// 뒤에 append (덮어쓰기/중복 제거 안 함 — 단순한 1회성 시드 동작).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const board = await db.board.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true, layout: true, classroomId: true },
    });
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }
    await requirePermission(board.id, user.id, "edit");

    if (board.layout !== "columns") {
      return NextResponse.json(
        { error: "주제별 보드에서만 사용할 수 있어요" },
        { status: 400 }
      );
    }
    if (!board.classroomId) {
      return NextResponse.json(
        { error: "학급에 연결된 보드만 학생으로 채울 수 있어요" },
        { status: 400 }
      );
    }

    const classroom = await db.classroom.findUnique({
      where: { id: board.classroomId },
      select: {
        teacherId: true,
        students: {
          select: { number: true, name: true },
          orderBy: [{ number: "asc" }, { createdAt: "asc" }],
        },
      },
    });
    if (!classroom || classroom.teacherId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (classroom.students.length === 0) {
      return NextResponse.json(
        { error: "학급에 학생이 없어요" },
        { status: 400 }
      );
    }

    const maxOrder = await db.section.aggregate({
      where: { boardId: board.id },
      _max: { order: true },
    });
    const startOrder = (maxOrder._max.order ?? -1) + 1;

    const created = await db.$transaction(
      classroom.students.map((s, i) =>
        db.section.create({
          data: {
            boardId: board.id,
            title: s.number ? `${s.number}번 ${s.name}` : s.name,
            order: startOrder + i,
          },
        })
      )
    );

    await touchBoardUpdatedAt(board.id);

    return NextResponse.json({ sections: created });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("[POST /api/boards/:id/sections/seed-students]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
