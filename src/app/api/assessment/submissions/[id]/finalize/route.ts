import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveIdentities } from "@/lib/identity";
import { canAccessSubmission } from "@/lib/assessment-permissions";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: submissionId } = await params;
  const ids = await resolveIdentities();
  const access = await canAccessSubmission(submissionId, ids);
  if (!access.allowed || !access.asTeacher) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!ids.teacher) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const submission = await db.assessmentSubmission.findUnique({
    where: { id: submissionId },
    include: { answers: true },
  });
  if (!submission) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (submission.status !== "submitted") {
    return NextResponse.json({ error: "not_submitted" }, { status: 409 });
  }

  const finalScore = submission.answers.reduce(
    (acc, a) => acc + (a.autoScore ?? 0),
    0
  );

  const entry = await db.gradebookEntry.upsert({
    where: { submissionId },
    create: {
      submissionId,
      finalScore,
      createdById: ids.teacher.userId,
    },
    update: { finalScore },
  });
  return NextResponse.json({ entry });
}
