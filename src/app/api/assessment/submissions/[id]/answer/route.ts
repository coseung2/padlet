import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveIdentities } from "@/lib/identity";
import type { McqAnswerPayload } from "@/types/assessment";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params;
  const ids = await resolveIdentities();
  if (!ids.student) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    questionId: string;
    selectedChoiceIds: string[];
  };
  if (!body?.questionId || !Array.isArray(body.selectedChoiceIds)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const submission = await db.assessmentSubmission.findUnique({
    where: { id: submissionId },
    select: { studentId: true, status: true, endAt: true, templateId: true },
  });
  if (!submission) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (submission.studentId !== ids.student.studentId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (submission.status === "submitted") {
    return NextResponse.json({ error: "already_submitted" }, { status: 409 });
  }
  if (submission.endAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "expired" }, { status: 409 });
  }

  // Verify the question actually belongs to this template so a student
  // can't write an answer for a sibling template's question id.
  const question = await db.assessmentQuestion.findUnique({
    where: { id: body.questionId },
    select: { templateId: true },
  });
  if (!question || question.templateId !== submission.templateId) {
    return NextResponse.json({ error: "question_mismatch" }, { status: 400 });
  }

  const payload: McqAnswerPayload = {
    selectedChoiceIds: body.selectedChoiceIds,
  };
  const answer = await db.assessmentAnswer.upsert({
    where: {
      submissionId_questionId: { submissionId, questionId: body.questionId },
    },
    create: { submissionId, questionId: body.questionId, payload },
    update: { payload },
  });
  return NextResponse.json({ answer });
}
