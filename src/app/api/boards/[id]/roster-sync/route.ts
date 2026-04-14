import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ASSIGNMENT_MAX_SLOTS } from "@/lib/assignment-schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ASSIGN_CARD_W = 240;
const ASSIGN_CARD_H = 160;

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: boardId } = await ctx.params;
  const user = await getCurrentUser();

  const board = await db.board.findUnique({
    where: { id: boardId },
    select: {
      id: true,
      classroomId: true,
      layout: true,
      classroom: { select: { teacherId: true } },
    },
  });
  if (!board) return NextResponse.json({ error: "board_not_found" }, { status: 404 });
  if (board.layout !== "assignment" || !board.classroomId || !board.classroom) {
    return NextResponse.json({ error: "not_assignment_board" }, { status: 400 });
  }
  if (board.classroom.teacherId !== user.id) {
    return NextResponse.json({ error: "not_classroom_teacher" }, { status: 403 });
  }

  const existingSlots = await db.assignmentSlot.findMany({
    where: { boardId },
    select: { studentId: true, slotNumber: true },
  });
  const existingStudentIds = new Set(existingSlots.map((s) => s.studentId));
  const maxSlotNumber = existingSlots.reduce((acc, s) => Math.max(acc, s.slotNumber), 0);

  const roster = await db.student.findMany({
    where: { classroomId: board.classroomId },
    orderBy: [{ number: "asc" }, { createdAt: "asc" }],
  });
  const newStudents = roster.filter((s) => !existingStudentIds.has(s.id));

  if (existingSlots.length + newStudents.length > ASSIGNMENT_MAX_SLOTS) {
    return NextResponse.json(
      {
        error: "would_exceed_max",
        max: ASSIGNMENT_MAX_SLOTS,
        existing: existingSlots.length,
        incoming: newStudents.length,
      },
      { status: 400 }
    );
  }

  const added: { id: string; slotNumber: number; studentId: string; studentName: string }[] = [];
  let cursor = maxSlotNumber;

  await db.$transaction(async (tx) => {
    for (const s of newStudents) {
      cursor += 1;
      const col = (cursor - 1) % 5;
      const row = Math.floor((cursor - 1) / 5);
      const card = await tx.card.create({
        data: {
          boardId,
          authorId: user.id,
          studentAuthorId: s.id,
          externalAuthorName: s.name,
          title: "",
          content: "",
          x: col * ASSIGN_CARD_W,
          y: row * ASSIGN_CARD_H,
          width: ASSIGN_CARD_W,
          height: ASSIGN_CARD_H,
        },
      });
      const newSlot = await tx.assignmentSlot.create({
        data: {
          boardId,
          studentId: s.id,
          slotNumber: cursor,
          cardId: card.id,
        },
      });
      added.push({
        id: newSlot.id,
        slotNumber: cursor,
        studentId: s.id,
        studentName: s.name,
      });
    }
  });

  return NextResponse.json({ addedSlots: added, skipped: existingSlots.length });
}
