/**
 * Shared auth helpers for plant-journal API routes.
 * - Student session takes precedence for "own plant" routes.
 * - Teacher (classroom owner) can read any plant in their classroom.
 */
import "server-only";
import { db } from "./db";
import { getCurrentUser } from "./auth";
import { getCurrentStudent } from "./student-auth";

export type PlantActor =
  | { kind: "student"; studentId: string; classroomId: string }
  | { kind: "teacher"; userId: string };

export async function resolvePlantActor(): Promise<PlantActor | null> {
  const [user, student] = await Promise.all([
    getCurrentUser().catch(() => null),
    getCurrentStudent(),
  ]);
  // Student session takes precedence so that a teacher who is also logged as
  // a student (same browser) is treated as the student actor first.
  if (student) {
    return { kind: "student", studentId: student.id, classroomId: student.classroomId };
  }
  if (user?.id) {
    return { kind: "teacher", userId: user.id };
  }
  return null;
}

export async function canAccessStudentPlant(
  studentPlantId: string,
  actor: PlantActor
): Promise<
  | { ok: true; ownedByActor: boolean; boardId: string; studentId: string; classroomId: string | null }
  | { ok: false; status: 403 | 404 }
> {
  const sp = await db.studentPlant.findUnique({
    where: { id: studentPlantId },
    select: {
      id: true,
      studentId: true,
      boardId: true,
      student: { select: { classroomId: true } },
      board: { select: { classroomId: true } },
    },
  });
  if (!sp) return { ok: false, status: 404 };
  const classroomId = sp.student.classroomId ?? sp.board.classroomId ?? null;

  if (actor.kind === "student") {
    const owned = sp.studentId === actor.studentId;
    if (!owned) return { ok: false, status: 403 };
    return { ok: true, ownedByActor: true, boardId: sp.boardId, studentId: sp.studentId, classroomId };
  }

  // Teacher — must own the classroom that contains this plant.
  if (!classroomId) return { ok: false, status: 403 };
  const classroom = await db.classroom.findUnique({
    where: { id: classroomId },
    select: { teacherId: true },
  });
  if (!classroom || classroom.teacherId !== actor.userId) {
    return { ok: false, status: 403 };
  }
  return { ok: true, ownedByActor: false, boardId: sp.boardId, studentId: sp.studentId, classroomId };
}
