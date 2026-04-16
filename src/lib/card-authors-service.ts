import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { formatAuthorList, type AuthorLike } from "./card-author";
import {
  MAX_AUTHORS_PER_CARD,
  MAX_DISPLAY_NAME_LEN,
} from "./card-authors-constants";

export { MAX_AUTHORS_PER_CARD, MAX_DISPLAY_NAME_LEN };

export type AuthorInput = {
  studentId?: string | null;
  displayName: string;
};

export class CardAuthorError extends Error {
  constructor(
    public code:
      | "authors_too_many"
      | "duplicate_student"
      | "displayName_required"
      | "displayName_too_long"
      | "student_not_in_classroom",
    message?: string
  ) {
    super(message ?? code);
    this.name = "CardAuthorError";
  }
}

type TxLike = Prisma.TransactionClient | PrismaClient;

/**
 * Replace-all CardAuthor rows for a card and mirror the primary (order=0)
 * author to Card.studentAuthorId + Card.externalAuthorName for legacy
 * display paths (CardAuthorFooter, parent-viewer hints, etc).
 *
 * Validates:
 *   - at most MAX_AUTHORS_PER_CARD entries
 *   - no duplicate studentId among entries
 *   - displayName non-empty + ≤ MAX_DISPLAY_NAME_LEN
 *   - (optional) every studentId belongs to classroomId when provided
 *
 * Order is normalised to 0..N-1 (the caller's order is preserved as the
 * tiebreaker; dropped fields are ignored).
 *
 * Idempotent: calling twice with the same input leaves the DB in the same
 * state. Caller wraps in a transaction when paired with Card create/update.
 */
export async function setCardAuthors(
  tx: TxLike,
  cardId: string,
  inputs: AuthorInput[],
  opts: { classroomId?: string | null } = {}
): Promise<{ primaryStudentId: string | null; externalAuthorName: string | null }> {
  if (inputs.length > MAX_AUTHORS_PER_CARD) {
    throw new CardAuthorError("authors_too_many");
  }
  const seenStudents = new Set<string>();
  for (const [i, a] of inputs.entries()) {
    if (!a.displayName || !a.displayName.trim()) {
      throw new CardAuthorError("displayName_required", `authors[${i}].displayName`);
    }
    if (a.displayName.length > MAX_DISPLAY_NAME_LEN) {
      throw new CardAuthorError("displayName_too_long", `authors[${i}].displayName`);
    }
    if (a.studentId) {
      if (seenStudents.has(a.studentId)) {
        throw new CardAuthorError("duplicate_student", `studentId=${a.studentId}`);
      }
      seenStudents.add(a.studentId);
    }
  }

  // Classroom membership guard — only when caller supplies the classroom
  // id. Boards without a classroom skip this check (free-form names OK).
  if (opts.classroomId && seenStudents.size > 0) {
    const rows = await tx.student.findMany({
      where: { id: { in: Array.from(seenStudents) } },
      select: { id: true, classroomId: true },
    });
    for (const r of rows) {
      if (r.classroomId !== opts.classroomId) {
        throw new CardAuthorError("student_not_in_classroom", `studentId=${r.id}`);
      }
    }
    if (rows.length !== seenStudents.size) {
      throw new CardAuthorError(
        "student_not_in_classroom",
        "unknown studentId(s) in payload"
      );
    }
  }

  // Normalise order, trim displayName.
  const normalised = inputs.map((a, i) => ({
    studentId: a.studentId ?? null,
    displayName: a.displayName.trim(),
    order: i,
  }));

  await tx.cardAuthor.deleteMany({ where: { cardId } });
  if (normalised.length > 0) {
    await tx.cardAuthor.createMany({
      data: normalised.map((n) => ({
        cardId,
        studentId: n.studentId,
        displayName: n.displayName,
        order: n.order,
      })),
    });
  }

  // Mirror primary to Card columns for legacy readers.
  const primary = normalised[0] ?? null;
  const mirrored = primary
    ? {
        studentAuthorId: primary.studentId,
        externalAuthorName: formatAuthorList(
          normalised as AuthorLike[],
          null,
          null,
          null
        ),
      }
    : { studentAuthorId: null, externalAuthorName: null };

  await tx.card.update({
    where: { id: cardId },
    data: mirrored,
  });

  return {
    primaryStudentId: mirrored.studentAuthorId,
    externalAuthorName: mirrored.externalAuthorName,
  };
}
