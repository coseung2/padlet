import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveIdentities } from "@/lib/identity";
import { gradeMcq } from "@/lib/assessment-grading";
import type { McqAnswerPayload, McqQuestionPayload } from "@/types/assessment";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params;
  const ids = await resolveIdentities();
  if (!ids.student) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const submission = await db.assessmentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      template: {
        include: { questions: { orderBy: { order: "asc" } } },
      },
      answers: true,
    },
  });
  if (!submission) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (submission.studentId !== ids.student.studentId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (submission.status === "submitted") {
    return NextResponse.json({ error: "already_submitted" }, { status: 409 });
  }

  // Grade every question. Unanswered questions score 0.
  let total = 0;
  const answerByQid = new Map(submission.answers.map((a) => [a.questionId, a]));
  const updates: Array<Promise<unknown>> = [];
  for (const q of submission.template.questions) {
    const row = answerByQid.get(q.id);
    const payload = row ? (row.payload as McqAnswerPayload) : null;
    const score = gradeMcq(
      { maxScore: q.maxScore, payload: q.payload as McqQuestionPayload },
      payload
    );
    total += score;
    if (row) {
      updates.push(
        db.assessmentAnswer.update({
          where: { id: row.id },
          data: { autoScore: score },
        })
      );
    } else {
      // Create a placeholder 0-score row so the gradebook knows we
      // evaluated this question (null payload distinguishes skipped).
      updates.push(
        db.assessmentAnswer.create({
          data: {
            submissionId,
            questionId: q.id,
            payload: { selectedChoiceIds: [] } satisfies McqAnswerPayload,
            autoScore: 0,
          },
        })
      );
    }
  }
  await Promise.all(updates);

  const updated = await db.assessmentSubmission.update({
    where: { id: submissionId },
    data: { status: "submitted", submittedAt: new Date() },
  });
  return NextResponse.json({ submission: updated, autoScore: total });
}
