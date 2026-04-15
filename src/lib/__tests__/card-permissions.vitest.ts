import { describe, it, expect } from "vitest";
import {
  canViewCard,
  canEditCard,
  canDeleteCard,
  canAddCardToBoard,
  boardCaps,
  type Identity,
  type BoardLike,
  type CardLike,
} from "../card-permissions";

// Test fixtures — minimal board + card shape.
const BOARD: BoardLike = {
  id: "b1",
  classroomId: "c1",
  ownerUserId: "u_teacher",
};

const BOARD_NO_CLASSROOM: BoardLike = {
  id: "b2",
  classroomId: null,
  ownerUserId: "u_teacher",
};

const CARD_TEACHER: CardLike = {
  id: "card1",
  boardId: "b1",
  authorId: "u_teacher",
  studentAuthorId: null,
};

const CARD_STUDENT_A: CardLike = {
  id: "card2",
  boardId: "b1",
  authorId: "u_teacher",
  studentAuthorId: "s_alice",
};

const CARD_STUDENT_B: CardLike = {
  id: "card3",
  boardId: "b1",
  authorId: "u_teacher",
  studentAuthorId: "s_bob",
};

// Cross-board card shouldn't pass — used to test boardId guard.
const CARD_OTHER_BOARD: CardLike = {
  id: "card4",
  boardId: "b_other",
  authorId: "u_teacher",
  studentAuthorId: "s_alice",
};

const teacherOwner: Identity = {
  kind: "teacher",
  userId: "u_teacher",
  name: "Teacher",
  ownsBoardIds: new Set(["b1", "b2"]),
};

const teacherNonOwner: Identity = {
  kind: "teacher",
  userId: "u_random",
  name: "Other",
  ownsBoardIds: new Set(),
};

const studentAlice: Identity = {
  kind: "student",
  studentId: "s_alice",
  name: "Alice",
  classroomId: "c1",
};

const studentBob: Identity = {
  kind: "student",
  studentId: "s_bob",
  name: "Bob",
  classroomId: "c1",
};

const studentOtherClass: Identity = {
  kind: "student",
  studentId: "s_zen",
  name: "Zen",
  classroomId: "c_other",
};

const parentOfAlice: Identity = {
  kind: "parent",
  parentId: "p_alice_parent",
  childStudentIds: new Set(["s_alice"]),
};

const parentOfNobody: Identity = {
  kind: "parent",
  parentId: "p_lonely",
  childStudentIds: new Set(),
};

const anon: Identity = { kind: "anon" };

describe("card-permissions — teacher", () => {
  it("owner can view/edit/delete any card on their board", () => {
    expect(canViewCard(teacherOwner, BOARD, CARD_TEACHER)).toBe(true);
    expect(canViewCard(teacherOwner, BOARD, CARD_STUDENT_A)).toBe(true);
    expect(canEditCard(teacherOwner, BOARD, CARD_STUDENT_A)).toBe(true);
    expect(canDeleteCard(teacherOwner, BOARD, CARD_STUDENT_A)).toBe(true);
  });
  it("owner can add cards to their board", () => {
    expect(canAddCardToBoard(teacherOwner, BOARD)).toBe(true);
    expect(canAddCardToBoard(teacherOwner, BOARD_NO_CLASSROOM)).toBe(true);
  });
  it("non-owner teacher has no card-level write access via primitive", () => {
    expect(canEditCard(teacherNonOwner, BOARD, CARD_TEACHER)).toBe(false);
    expect(canDeleteCard(teacherNonOwner, BOARD, CARD_STUDENT_A)).toBe(false);
    expect(canAddCardToBoard(teacherNonOwner, BOARD)).toBe(false);
  });
});

describe("card-permissions — student", () => {
  it("same-classroom student can view all cards on board", () => {
    expect(canViewCard(studentAlice, BOARD, CARD_TEACHER)).toBe(true);
    expect(canViewCard(studentAlice, BOARD, CARD_STUDENT_A)).toBe(true);
    expect(canViewCard(studentAlice, BOARD, CARD_STUDENT_B)).toBe(true);
  });
  it("student can edit/delete only their own card", () => {
    expect(canEditCard(studentAlice, BOARD, CARD_STUDENT_A)).toBe(true);
    expect(canDeleteCard(studentAlice, BOARD, CARD_STUDENT_A)).toBe(true);
    expect(canEditCard(studentAlice, BOARD, CARD_STUDENT_B)).toBe(false);
    expect(canEditCard(studentAlice, BOARD, CARD_TEACHER)).toBe(false);
  });
  it("student can add cards to their classroom's board", () => {
    expect(canAddCardToBoard(studentAlice, BOARD)).toBe(true);
  });
  it("student can't add to board without classroom", () => {
    expect(canAddCardToBoard(studentAlice, BOARD_NO_CLASSROOM)).toBe(false);
  });
  it("student from different classroom is denied everywhere", () => {
    expect(canViewCard(studentOtherClass, BOARD, CARD_STUDENT_A)).toBe(false);
    expect(canEditCard(studentOtherClass, BOARD, CARD_STUDENT_A)).toBe(false);
    expect(canAddCardToBoard(studentOtherClass, BOARD)).toBe(false);
  });
});

describe("card-permissions — parent", () => {
  it("parent can view card of their child", () => {
    expect(canViewCard(parentOfAlice, BOARD, CARD_STUDENT_A)).toBe(true);
  });
  it("parent cannot view other children's cards", () => {
    expect(canViewCard(parentOfAlice, BOARD, CARD_STUDENT_B)).toBe(false);
    expect(canViewCard(parentOfAlice, BOARD, CARD_TEACHER)).toBe(false);
  });
  it("parent cannot edit/delete/add — read-only", () => {
    expect(canEditCard(parentOfAlice, BOARD, CARD_STUDENT_A)).toBe(false);
    expect(canDeleteCard(parentOfAlice, BOARD, CARD_STUDENT_A)).toBe(false);
    expect(canAddCardToBoard(parentOfAlice, BOARD)).toBe(false);
  });
  it("parent without active children sees nothing", () => {
    expect(canViewCard(parentOfNobody, BOARD, CARD_STUDENT_A)).toBe(false);
  });
});

describe("card-permissions — anon + edge cases", () => {
  it("anonymous sees nothing and can do nothing", () => {
    expect(canViewCard(anon, BOARD, CARD_TEACHER)).toBe(false);
    expect(canEditCard(anon, BOARD, CARD_STUDENT_A)).toBe(false);
    expect(canAddCardToBoard(anon, BOARD)).toBe(false);
  });
  it("cross-board card is always false (boardId guard)", () => {
    expect(canViewCard(teacherOwner, BOARD, CARD_OTHER_BOARD)).toBe(false);
    expect(canEditCard(studentAlice, BOARD, CARD_OTHER_BOARD)).toBe(false);
  });
});

describe("boardCaps convenience", () => {
  it("teacher owner gets full caps", () => {
    const caps = boardCaps(teacherOwner, BOARD);
    expect(caps.canAddCard).toBe(true);
    expect(caps.canEditOwn).toBe(true);
  });
  it("student same-classroom gets add + edit-own", () => {
    const caps = boardCaps(studentAlice, BOARD);
    expect(caps.canAddCard).toBe(true);
    expect(caps.canEditOwn).toBe(true);
  });
  it("parent cannot add or edit", () => {
    const caps = boardCaps(parentOfAlice, BOARD);
    expect(caps.canAddCard).toBe(false);
    expect(caps.canEditOwn).toBe(false);
  });
});
