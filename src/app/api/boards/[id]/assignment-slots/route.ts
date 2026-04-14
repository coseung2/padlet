import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getBoardWithClassroom,
  resolveAssignViewer,
  slotRowToDTO,
  SLOT_INCLUDE_DEFAULT,
} from "@/lib/assignment-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: boardId } = await ctx.params;
  const board = await getBoardWithClassroom(boardId);
  if (!board) return NextResponse.json({ error: "board_not_found" }, { status: 404 });

  const viewer = await resolveAssignViewer();

  if (viewer.kind === "teacher") {
    if (!board.classroom || board.classroom.teacherId !== viewer.userId) {
      return NextResponse.json({ error: "not_classroom_teacher" }, { status: 403 });
    }
    const slots = await db.assignmentSlot.findMany({
      where: { boardId },
      orderBy: { slotNumber: "asc" },
      include: SLOT_INCLUDE_DEFAULT,
    });
    return NextResponse.json({
      board: {
        id: board.id,
        slug: board.slug,
        title: board.title,
        assignmentGuideText: board.assignmentGuideText ?? "",
        assignmentAllowLate: board.assignmentAllowLate,
        assignmentDeadline: board.assignmentDeadline?.toISOString() ?? null,
      },
      slots: slots.map(slotRowToDTO),
    });
  }

  if (viewer.kind === "student") {
    // Student sees ONLY their own slot — DOM filtering at source (AC-10).
    if (board.classroomId !== viewer.classroomId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const slot = await db.assignmentSlot.findUnique({
      where: { boardId_studentId: { boardId, studentId: viewer.studentId } },
      include: SLOT_INCLUDE_DEFAULT,
    });
    return NextResponse.json({
      board: {
        id: board.id,
        slug: board.slug,
        title: board.title,
        assignmentGuideText: board.assignmentGuideText ?? "",
        assignmentAllowLate: board.assignmentAllowLate,
        assignmentDeadline: board.assignmentDeadline?.toISOString() ?? null,
      },
      slots: slot ? [slotRowToDTO(slot)] : [],
    });
  }

  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
