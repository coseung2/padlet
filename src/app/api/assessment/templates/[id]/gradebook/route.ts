import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveIdentities } from "@/lib/identity";
import { canManageAssessment } from "@/lib/assessment-permissions";
import { isCorrectMcq } from "@/lib/assessment-grading";
import type {
  AssessmentGradebookPayload,
  McqAnswerPayload,
  McqQuestionPayload,
  TeacherQuestionDTO,
} from "@/types/assessment";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ids = await resolveIdentities();
  if (!(await canManageAssessment(id, ids))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const template = await db.assessmentTemplate.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      classroom: {
        include: { students: { orderBy: [{ number: "asc" }, { name: "asc" }] } },
      },
      submissions: {
        include: {
          answers: true,
          gradebookEntry: true,
        },
      },
    },
  });
  if (!template) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const submissionByStudent = new Map(
    template.submissions.map((s) => [s.studentId, s])
  );

  const maxScoreTotal = template.questions.reduce(
    (acc, q) => acc + q.maxScore,
    0
  );

  const teacherQuestions: TeacherQuestionDTO[] = template.questions.map((q) => {
    const payload = q.payload as McqQuestionPayload;
    return {
      id: q.id,
      order: q.order,
      kind: "MCQ" as const,
      prompt: q.prompt,
      maxScore: q.maxScore,
      choices: payload.choices,
      correctChoiceIds: payload.correctChoiceIds,
    };
  });

  const rows = template.classroom.students.map((student) => {
    const submission = submissionByStudent.get(student.id) ?? null;
    const answers = (submission?.answers ?? []).map((a) => {
      const selected = (a.payload as McqAnswerPayload).selectedChoiceIds ?? [];
      const q = template.questions.find((x) => x.id === a.questionId);
      const correctIds =
        q && (q.payload as McqQuestionPayload).correctChoiceIds;
      const correct = correctIds ? isCorrectMcq(correctIds, selected) : null;
      return {
        questionId: a.questionId,
        selectedChoiceIds: selected,
        correct,
        autoScore: a.autoScore,
      };
    });
    return {
      student: { id: student.id, name: student.name, number: student.number },
      submission: submission
        ? {
            id: submission.id,
            status: submission.status as "in_progress" | "submitted",
            startedAt: submission.startedAt.toISOString(),
            submittedAt: submission.submittedAt?.toISOString() ?? null,
          }
        : null,
      answers,
      entry: submission?.gradebookEntry
        ? {
            id: submission.gradebookEntry.id,
            finalScore: submission.gradebookEntry.finalScore,
            releasedAt:
              submission.gradebookEntry.releasedAt?.toISOString() ?? null,
          }
        : null,
      totalAutoScore: answers.reduce(
        (acc, a) => acc + (a.autoScore ?? 0),
        0
      ),
    };
  });

  const payload: AssessmentGradebookPayload = {
    template: {
      id: template.id,
      classroomId: template.classroomId,
      boardId: template.boardId,
      title: template.title,
      durationMin: template.durationMin,
      createdById: template.createdById,
      createdAt: template.createdAt.toISOString(),
      questions: teacherQuestions,
    },
    rows,
    maxScoreTotal,
  };
  return NextResponse.json(payload);
}
