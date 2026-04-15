import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveIdentity } from "@/lib/identity";
import { canEditCard, type BoardLike, type CardLike } from "@/lib/card-permissions";
import {
  setCardAuthors,
  MAX_AUTHORS_PER_CARD,
  MAX_DISPLAY_NAME_LEN,
  CardAuthorError,
} from "@/lib/card-authors-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AuthorEntrySchema = z.object({
  studentId: z.string().min(1).max(40).nullable().optional(),
  displayName: z.string().min(1).max(MAX_DISPLAY_NAME_LEN),
});

const BodySchema = z.object({
  authors: z.array(AuthorEntrySchema).max(MAX_AUTHORS_PER_CARD),
});

/**
 * PUT /api/cards/:id/authors — teacher-only replace-all.
 *
 * Why replace-all and not a PATCH-per-row API:
 *   - a single transaction guarantees Card.studentAuthorId mirror and
 *     CardAuthor.order=0 stay consistent
 *   - the editor UX is a whole-list pick-and-save, not individual CRUD
 *   - simpler contract for retry / idempotency
 *
 * Boards without a classroom skip the student-membership guard so
 * free-form display rows (no studentId) are allowed everywhere.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const card = await db.card.findUnique({ where: { id } });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }
    const board = await db.board.findUnique({
      where: { id: card.boardId },
      select: {
        id: true,
        classroomId: true,
        classroom: { select: { teacherId: true } },
      },
    });
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

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

    // Author re-assignment is a strictly teacher-owner action — students
    // can edit their own card content via PATCH but cannot change who is
    // credited. Enforce here to avoid UI-only gating.
    if (
      identity.kind !== "teacher" ||
      !identity.ownsBoardIds.has(board.id) ||
      !canEditCard(identity, boardLike, cardLike)
    ) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", detail: parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      return await setCardAuthors(tx, card.id, parsed.data.authors, {
        classroomId: board.classroomId,
      });
    });

    const authors = await db.cardAuthor.findMany({
      where: { cardId: card.id },
      orderBy: { order: "asc" },
      select: { id: true, studentId: true, displayName: true, order: true },
    });

    return NextResponse.json({
      authors,
      primary: {
        studentAuthorId: result.primaryStudentId,
        externalAuthorName: result.externalAuthorName,
      },
    });
  } catch (e) {
    if (e instanceof CardAuthorError) {
      return NextResponse.json({ error: e.code, detail: e.message }, { status: 400 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
    console.error("[PUT /api/cards/:id/authors]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
