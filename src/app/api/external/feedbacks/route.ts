// GET /api/external/feedbacks?classroomCode=XXXXXX
//
// Aura 컴패니언(교사용 별도 웹앱) 풀 엔드포인트.
// /api/external/grades 와 동일한 인증 패턴 (Bearer AURA_BRIDGE_TOKEN).
// flat 배열 반환 — row 1개 = JSON 1개. id 가 Aura 측 art_comment_drafts.aura_board_ref_id UNIQUE 키.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const BRIDGE_TOKEN = process.env.AURA_BRIDGE_TOKEN;

function checkAuth(req: Request): boolean {
  if (!BRIDGE_TOKEN) return false;
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice(7).trim() === BRIDGE_TOKEN;
}

export async function GET(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const classroomCode = url.searchParams.get("classroomCode");
  if (!classroomCode) {
    return NextResponse.json({ error: "classroomCode required" }, { status: 400 });
  }

  const classroom = await db.classroom.findUnique({
    where: { code: classroomCode },
    select: { id: true, code: true },
  });
  if (!classroom) {
    return NextResponse.json({ error: "classroom_not_found" }, { status: 404 });
  }

  const rows = await db.aiFeedback.findMany({
    where: { classroomId: classroom.id },
    orderBy: { updatedAt: "desc" },
    include: {
      student: { select: { number: true, name: true } },
    },
  });

  const feedbacks = rows.map((r) => ({
    id: r.id,
    classroomCode: classroom.code,
    studentNumber: r.student.number,
    studentName: r.student.name,
    subject: r.subject,
    unit: r.unit,
    criterion: r.criterion,
    comment: r.comment,
    model: r.model,
    sentAt: r.updatedAt.toISOString(),
  }));

  return NextResponse.json({ feedbacks });
}
