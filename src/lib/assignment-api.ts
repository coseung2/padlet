import "server-only";
import { db } from "./db";
import { getCurrentUser } from "./auth";
import { getCurrentStudent } from "./student-auth";
import type { AssignmentSlotDTO } from "@/types/assignment";
import type {
  AssignmentSubmissionStatus,
  AssignmentGradingStatus,
} from "./assignment-schemas";

/**
 * Shared helpers for assignment-board API routes. Each endpoint re-verifies
 * identity at call time; these helpers only own data shape + guard matrix.
 */

export type BoardWithClassroom = {
  id: string;
  slug: string;
  title: string;
  classroomId: string | null;
  assignmentGuideText: string | null;
  assignmentAllowLate: boolean;
  assignmentDeadline: Date | null;
  classroom: { teacherId: string } | null;
};

export async function getBoardWithClassroom(boardId: string): Promise<BoardWithClassroom | null> {
  return db.board.findUnique({
    where: { id: boardId },
    select: {
      id: true,
      slug: true,
      title: true,
      classroomId: true,
      assignmentGuideText: true,
      assignmentAllowLate: true,
      assignmentDeadline: true,
      classroom: { select: { teacherId: true } },
    },
  });
}

export type AssignViewer =
  | { kind: "teacher"; userId: string }
  | { kind: "student"; studentId: string; classroomId: string }
  | { kind: "anonymous" };

export async function resolveAssignViewer(): Promise<AssignViewer> {
  // Teacher (NextAuth) takes precedence when available — mock-role doesn't
  // apply because assignment-board callers need real identity for RBAC.
  try {
    const user = await getCurrentUser();
    if (user?.id) return { kind: "teacher", userId: user.id };
  } catch {
    /* fall through */
  }
  const s = await getCurrentStudent();
  if (s) return { kind: "student", studentId: s.id, classroomId: s.classroomId };
  return { kind: "anonymous" };
}

type RawSlotRow = {
  id: string;
  slotNumber: number;
  studentId: string;
  submissionStatus: string;
  gradingStatus: string;
  grade: string | null;
  viewedAt: Date | null;
  returnedAt: Date | null;
  returnReason: string | null;
  student: { name: string };
  card: {
    id: string;
    content: string;
    imageUrl: string | null;
    linkUrl: string | null;
    updatedAt: Date;
  };
  submission: { fileUrl: string | null } | null;
};

export function slotRowToDTO(row: RawSlotRow): AssignmentSlotDTO {
  return {
    id: row.id,
    slotNumber: row.slotNumber,
    studentId: row.studentId,
    studentName: row.student.name,
    submissionStatus: row.submissionStatus as AssignmentSubmissionStatus,
    gradingStatus: row.gradingStatus as AssignmentGradingStatus,
    grade: row.grade,
    viewedAt: row.viewedAt?.toISOString() ?? null,
    returnedAt: row.returnedAt?.toISOString() ?? null,
    returnReason: row.returnReason,
    card: {
      id: row.card.id,
      content: row.card.content,
      imageUrl: row.card.imageUrl,
      // v1: thumbUrl intentionally mirrors imageUrl until the sharp pipeline
      // lands in phase8 review follow-up. Client uses loading="lazy" +
      // explicit 160×120 CSS to stay within the AC-12 perf budget.
      thumbUrl: row.card.imageUrl,
      linkUrl: row.card.linkUrl,
      fileUrl: row.submission?.fileUrl ?? null,
      updatedAt: row.card.updatedAt.toISOString(),
    },
  };
}

export const SLOT_INCLUDE_DEFAULT = {
  student: { select: { name: true } },
  card: {
    select: {
      id: true,
      content: true,
      imageUrl: true,
      linkUrl: true,
      updatedAt: true,
    },
  },
  submission: { select: { fileUrl: true } },
} as const;
