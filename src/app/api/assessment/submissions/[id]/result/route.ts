import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveIdentities } from "@/lib/identity";
import { canAccessSubmission } from "@/lib/assessment-permissions";
import { isCorrectMcq } from "@/lib/assessment-grading";
import type {
  AssessmentResultPayload,
  McqAnswerPayload,
  McqQuestionPayload,
} from "@/types/assessment";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params;
  const ids = await resolveIdentities();
  const access = await canAccessSubmission(submissionId, ids);
  if (!access.allowed) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const submission = await db.assessmentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      template: { include: { questions: { orderBy: { order: "asc" } } } },
      answers: true,
      gradebookEntry: true,
    },
  });
  if (!submission) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const released = !!submission.gradebookEntry?.releasedAt;
  if (!released && !access.asTeacher) {
    // Student sees a placeholder until the teacher releases.
    const body: AssessmentResultPayload = { released: false };
    return NextResponse.json(body);
  }

  const maxScoreTotal = submission.template.questions.reduce(
    (acc, q) => acc + q.maxScore,
    0
  );
  const answerByQid = new Map(submission.answers.map((a) => [a.questionId, a]));
  const questions = submission.template.questions.map((q) => {
    const qp = q.payload as McqQuestionPayload;
    const row = answerByQid.get(q.id);
    const selected = row ? (row.payload as McqAnswerPayload).selectedChoiceIds : [];
    return {
      id: q.id,
      prompt: q.prompt,
      choices: qp.choices,
      correctChoiceIds: qp.correctChoiceIds,
      selectedChoiceIds: selected,
      correct: isCorrectMcq(qp.correctChoiceIds, selected),
    };
  });

  const finalScore =
    submission.gradebookEntry?.finalScore ??
    submission.answers.reduce((acc, a) => acc + (a.autoScore ?? 0), 0);

  const body: AssessmentResultPayload = {
    released: true,
    finalScore,
    maxScoreTotal,
    questions,
  };
  return NextResponse.json(body);
}
