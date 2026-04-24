// POST /api/ai-feedback — UPSERT (보내기 클릭 시점)
// GET  /api/ai-feedback?classroomId=xxx&studentId=xxx — 교사 본인 평어 조회

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { resolveFeedbackContextByStudent } from "@/lib/ai-feedback/auth";

const PostBody = z.object({
  studentId: z.string().min(1),
  subject: z.string().min(1).max(40),
  unit: z.string().min(1).max(120),
  criterion: z.string().min(1).max(120),
  comment: z.string().min(1).max(2000),
  model: z.string().min(1).max(80),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = PostBody.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let ctx;
  try {
    ctx = await resolveFeedbackContextByStudent(user.id, parsed.studentId);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: (e as Error).message === "not_classroom_owner" ? 403 : 400 }
    );
  }

  // UPSERT — 같은 (학생, 과목, 단원, 평가항목) 조합 재생성 시 덮어쓰기.
  const row = await db.aiFeedback.upsert({
    where: {
      studentId_subject_unit_criterion: {
        studentId: ctx.studentId,
        subject: parsed.subject,
        unit: parsed.unit,
        criterion: parsed.criterion,
      },
    },
    create: {
      teacherId: ctx.teacherId,
      classroomId: ctx.classroomId,
      studentId: ctx.studentId,
      subject: parsed.subject,
      unit: parsed.unit,
      criterion: parsed.criterion,
      comment: parsed.comment,
      model: parsed.model,
    },
    update: {
      comment: parsed.comment,
      model: parsed.model,
      teacherId: ctx.teacherId,
      classroomId: ctx.classroomId,
    },
  });

  return NextResponse.json({ feedback: row });
}

const GetQuery = z.object({
  classroomId: z.string().min(1).optional(),
  studentId: z.string().min(1).optional(),
});

export async function GET(req: Request) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = GetQuery.safeParse({
    classroomId: url.searchParams.get("classroomId") ?? undefined,
    studentId: url.searchParams.get("studentId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  const where: { teacherId: string; classroomId?: string; studentId?: string } = {
    teacherId: user.id,
  };
  if (parsed.data.classroomId) where.classroomId = parsed.data.classroomId;
  if (parsed.data.studentId) where.studentId = parsed.data.studentId;

  const rows = await db.aiFeedback.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ feedbacks: rows });
}
