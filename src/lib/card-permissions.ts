/**
 * Card-level permission primitives for role-model-cleanup.
 *
 * Identity × ownership → capabilities. Pure functions with no I/O so they
 * can be called from server components, API routes, and (if needed) from
 * client components that already have the identity object in hand.
 *
 * The legacy BoardMember.role enum (`owner|editor|viewer`) is being
 * retired — it couldn't express "student is editor of their own card but
 * viewer of others'" because role was single-valued. See
 * `tasks/2026-04-15-role-model-cleanup/phase1/research.md` for the
 * motivation.
 */

export type Identity =
  | {
      kind: "teacher";
      userId: string;
      name: string;
      /** Boards where this teacher is the classroom/board owner. */
      ownsBoardIds: Set<string>;
    }
  | {
      kind: "student";
      studentId: string;
      name: string;
      classroomId: string;
    }
  | {
      kind: "parent";
      parentId: string;
      /** Active (status='active' AND deletedAt:null) child student ids. */
      childStudentIds: Set<string>;
    }
  | { kind: "anon" };

export type BoardLike = {
  id: string;
  classroomId: string | null;
  /** classroom.teacherId when present, else BoardMember.role='owner' userId. */
  ownerUserId: string | null;
};

export type CardLike = {
  id: string;
  boardId: string;
  /** Always a teacher (User.id). */
  authorId: string;
  /** Set when a student published the card. */
  studentAuthorId: string | null;
};

/** Base eligibility — does the identity even get to enumerate this board? */
function isBoardReader(id: Identity, b: BoardLike): boolean {
  switch (id.kind) {
    case "teacher":
      // Teacher owners read freely. Other teachers (mock/editor/viewer
      // BoardMember rows) fall through — they get read-only via the
      // existing requirePermission("view") path on teacher-only routes.
      return id.ownsBoardIds.has(b.id);
    case "student":
      return !!b.classroomId && b.classroomId === id.classroomId;
    case "parent":
      // Parents don't browse boards directly; they consume
      // /parent/(app)/child/[sid]/* pages that project the board data.
      // canViewCard handles per-card gating; board-level reader=true when
      // they have at least one active child (caller still filters cards).
      return id.childStudentIds.size > 0;
    case "anon":
      return false;
  }
}

export function canViewCard(id: Identity, b: BoardLike, c: CardLike): boolean {
  if (c.boardId !== b.id) return false;
  switch (id.kind) {
    case "teacher":
      // Board owners see all; non-owner teachers fall through (treated as
      // anon at card level — they should come via requirePermission on
      // teacher routes which check board membership differently).
      return id.ownsBoardIds.has(b.id);
    case "student":
      return !!b.classroomId && b.classroomId === id.classroomId;
    case "parent":
      return !!c.studentAuthorId && id.childStudentIds.has(c.studentAuthorId);
    case "anon":
      return false;
  }
}

export function canEditCard(id: Identity, b: BoardLike, c: CardLike): boolean {
  if (c.boardId !== b.id) return false;
  switch (id.kind) {
    case "teacher":
      return id.ownsBoardIds.has(b.id);
    case "student":
      if (!b.classroomId || b.classroomId !== id.classroomId) return false;
      return c.studentAuthorId === id.studentId;
    case "parent":
    case "anon":
      return false;
  }
}

export function canDeleteCard(
  id: Identity,
  b: BoardLike,
  c: CardLike
): boolean {
  // Same rules as edit in this phase — no separate "delete reserved for
  // owners only" tier. canEditCard already narrows student to own-card.
  return canEditCard(id, b, c);
}

export function canAddCardToBoard(id: Identity, b: BoardLike): boolean {
  switch (id.kind) {
    case "teacher":
      return id.ownsBoardIds.has(b.id);
    case "student":
      return !!b.classroomId && b.classroomId === id.classroomId;
    case "parent":
    case "anon":
      return false;
  }
}

/** Convenience bundle — useful for server components that want to ship a
 *  single `caps` prop to the client instead of the Identity. */
export type BoardCaps = {
  canAddCard: boolean;
  /** True when the viewer can edit at least their own cards (student) or
   *  any card (teacher owner). Card-level gating still uses canEditCard. */
  canEditOwn: boolean;
};

export function boardCaps(id: Identity, b: BoardLike): BoardCaps {
  return {
    canAddCard: canAddCardToBoard(id, b),
    canEditOwn:
      (id.kind === "teacher" && id.ownsBoardIds.has(b.id)) ||
      (id.kind === "student" &&
        !!b.classroomId &&
        b.classroomId === id.classroomId),
  };
}

// Read-only signal for future code that wants to narrow a BoardReader.
export { isBoardReader };
