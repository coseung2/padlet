/**
 * POST /api/event/review   { submissionId, score, comment }
 *
 * Teacher/editor only. Upserts a SubmissionReview for (submissionId, reviewerId)
 * and recomputes Submission.scoreAvg (float, mean of SubmissionReview.score).
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { reviewPayloadSchema } from "@/lib/event/schemas";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = reviewPayloadSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  const p = parsed.data;

  const submission = await db.submission.findUnique({
    where: { id: p.submissionId },
    select: { id: true, boardId: true },
  });
  if (!submission) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    await requirePermission(submission.boardId, user.id, "edit");
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw e;
  }

  await db.submissionReview.upsert({
    where: { submissionId_reviewerId: { submissionId: p.submissionId, reviewerId: user.id } },
    create: { submissionId: p.submissionId, reviewerId: user.id, score: p.score, comment: p.comment },
    update: { score: p.score, comment: p.comment },
  });

  // Recompute scoreAvg
  const reviews = await db.submissionReview.findMany({
    where: { submissionId: p.submissionId },
    select: { score: true },
  });
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.score, 0) / reviews.length : null;
  await db.submission.update({
    where: { id: p.submissionId },
    data: { scoreAvg: avg },
  });

  return NextResponse.json({ ok: true, scoreAvg: avg, reviewCount: reviews.length });
}
