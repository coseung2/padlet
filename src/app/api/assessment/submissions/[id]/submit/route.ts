import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveIdentities } from "@/lib/identity";
import { gradeMcq, gradeShort } from "@/lib/assessment-grading";
import type {
  McqAnswerPayload,
  McqQuestionPayload,
  ShortAnswerPayload,
  ShortQuestionPayload,
} from "@/types/assessment";

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
    let score: number;
    if (q.kind === "MCQ") {
      const payload = row ? (row.payload as McqAnswerPayload) : null;
      score = gradeMcq(
        { maxScore: q.maxScore, payload: q.payload as McqQuestionPayload },
        payload
      );
    } else if (q.kind === "SHORT") {
      const payload = row ? (row.payload as ShortAnswerPayload) : null;
      score = gradeShort(
        { maxScore: q.maxScore, payload: q.payload as ShortQuestionPayload },
        payload
      );
    } else {
      score = 0;
    }
    total += score;
    if (row) {
      updates.push(
        db.assessmentAnswer.update({
          where: { id: row.id },
          data: { autoScore: score },
        })
      );
    } else {
      // Placeholder row so the gradebook can distinguish "skipped" from
      // "not-yet-graded". Shape matches the question kind.
      updates.push(
        db.assessmentAnswer.create({
          data: {
            submissionId,
            questionId: q.id,
            payload:
              q.kind === "MCQ"
                ? ({ selectedChoiceIds: [] } satisfies McqAnswerPayload)
                : ({ textAnswer: "" } satisfies ShortAnswerPayload),
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
