import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ForbiddenError } from "@/lib/rbac";
import { resolveIdentity } from "@/lib/identity";
import { canEditCard, type BoardLike, type CardLike } from "@/lib/card-permissions";

const MoveCardSchema = z.object({
  sectionId: z.string().nullable(),
  order: z.number().int().min(0),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const card = await db.card.findUnique({ where: { id } });
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

    const board = await db.board.findUnique({
      where: { id: card.boardId },
      select: {
        id: true,
        classroomId: true,
        classroom: { select: { teacherId: true } },
      },
    });
    if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });

    const identity = await resolveIdentity();
    const boardLike: BoardLike = {
      id: board.id,
      classroomId: board.classroomId,
      ownerUserId: board.classroom?.teacherId ?? null,
    };
    const cardLike: CardLike = {
      id: card.id,
      boardId: card.boardId,
      authorId: card.authorId,
      studentAuthorId: card.studentAuthorId,
    };
    if (!canEditCard(identity, boardLike, cardLike)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const input = MoveCardSchema.parse(body);

    const updated = await db.card.update({
      where: { id },
      data: { sectionId: input.sectionId, order: input.order },
    });

    return NextResponse.json({ card: updated });
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[PATCH /api/cards/:id/move]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
