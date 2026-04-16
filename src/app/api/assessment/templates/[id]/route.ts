import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveIdentities } from "@/lib/identity";
import { canViewAssessmentTemplate, canManageAssessment } from "@/lib/assessment-permissions";
import type {
  AssessmentTemplateStudentDTO,
  AssessmentTemplateTeacherDTO,
} from "@/types/assessment";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ids = await resolveIdentities();
  if (!(await canViewAssessmentTemplate(id, ids))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const template = await db.assessmentTemplate.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!template) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const asTeacher = await canManageAssessment(id, ids);
  if (asTeacher) {
    const dto: AssessmentTemplateTeacherDTO = {
      id: template.id,
      classroomId: template.classroomId,
      boardId: template.boardId,
      title: template.title,
      durationMin: template.durationMin,
      createdById: template.createdById,
      createdAt: template.createdAt.toISOString(),
      questions: template.questions.map((q) => {
        const payload = q.payload as { choices: { id: string; text: string }[]; correctChoiceIds: string[] };
        return {
          id: q.id,
          order: q.order,
          kind: "MCQ" as const,
          prompt: q.prompt,
          maxScore: q.maxScore,
          choices: payload.choices,
          correctChoiceIds: payload.correctChoiceIds,
        };
      }),
    };
    return NextResponse.json({ template: dto, viewer: "teacher" });
  }

  // Student view — correctChoiceIds stripped.
  const dto: AssessmentTemplateStudentDTO = {
    id: template.id,
    classroomId: template.classroomId,
    boardId: template.boardId,
    title: template.title,
    durationMin: template.durationMin,
    questions: template.questions.map((q) => {
      const payload = q.payload as { choices: { id: string; text: string }[] };
      return {
        id: q.id,
        order: q.order,
        kind: "MCQ" as const,
        prompt: q.prompt,
        maxScore: q.maxScore,
        choices: payload.choices,
      };
    }),
  };
  return NextResponse.json({ template: dto, viewer: "student" });
}
