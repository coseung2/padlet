import { db } from "./db";
import type { Identities } from "./card-permissions";

/**
 * Teacher-scope check: may this identity manage the assessment
 * template (create questions, see gradebook, finalize, release)?
 * Ownership = Classroom.teacherId match against the signed-in
 * teacher's User.id. RLS at DB level is deferred to MVP-4; the
 * application layer is currently authoritative.
 */
export async function canManageAssessment(
  templateId: string,
  ids: Identities
): Promise<boolean> {
  if (!ids.teacher) return false;
  const template = await db.assessmentTemplate.findUnique({
    where: { id: templateId },
    select: { classroom: { select: { teacherId: true } } },
  });
  if (!template) return false;
  return template.classroom.teacherId === ids.teacher.userId;
}

/**
 * Student-scope check: is the signed-in student a member of the
 * classroom this template belongs to? (Teachers also pass for
 * diagnostic views but the standard caller should split teacher
 * path through canManageAssessment.)
 */
export async function canViewAssessmentTemplate(
  templateId: string,
  ids: Identities
): Promise<boolean> {
  if (ids.teacher) {
    return canManageAssessment(templateId, ids);
  }
  if (!ids.student) return false;
  const template = await db.assessmentTemplate.findUnique({
    where: { id: templateId },
    select: { classroomId: true },
  });
  if (!template) return false;
  return template.classroomId === ids.student.classroomId;
}

/** Submission owner (student) check — teachers pass via manage
 *  check on the parent template. */
export async function canAccessSubmission(
  submissionId: string,
  ids: Identities
): Promise<{ allowed: boolean; asTeacher: boolean }> {
  const submission = await db.assessmentSubmission.findUnique({
    where: { id: submissionId },
    select: {
      studentId: true,
      template: { select: { classroom: { select: { teacherId: true } } } },
    },
  });
  if (!submission) return { allowed: false, asTeacher: false };
  if (
    ids.teacher &&
    submission.template.classroom.teacherId === ids.teacher.userId
  ) {
    return { allowed: true, asTeacher: true };
  }
  if (ids.student && submission.studentId === ids.student.studentId) {
    return { allowed: true, asTeacher: false };
  }
  return { allowed: false, asTeacher: false };
}
