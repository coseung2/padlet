/**
 * POST /api/external/student-login
 *
 * 학생 코드(qrToken 또는 textCode) 를 받아 `aurastu_` 액세스 토큰을
 * 돌려준다. 쿠키 기반 /api/student/auth 와 달리 이 엔드포인트는 cookie
 * 를 설정하지 않으며, Canva Content Publisher intent 의 settings UI
 * 가 토큰을 publishRef 에 저장해 Bearer 로 재사용한다. 네이티브
 * 태블릿 Canva 앱처럼 쿠키 공유가 불가능한 환경에서도 작동한다.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { issueTokenPairFor } from "@/lib/oauth-server";

export const runtime = "nodejs";

const BodySchema = z.object({
  code: z.string().min(1).max(64),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }
  const raw = parsed.data.code.trim();

  // qrToken (UUID) 우선, textCode 대문자 매칭 fallback — /api/student/auth 와 동일.
  let student = await db.student.findUnique({
    where: { qrToken: raw },
    include: { classroom: true },
  });
  if (!student) {
    student = await db.student.findUnique({
      where: { textCode: raw.toUpperCase() },
      include: { classroom: true },
    });
  }
  if (!student) {
    return NextResponse.json({ error: "invalid_code" }, { status: 404 });
  }

  const pair = await issueTokenPairFor({
    studentId: student.id,
    clientId: "canva",
    scope: "cards:write",
  });

  return NextResponse.json({
    accessToken: pair.accessToken,
    expiresIn: pair.expiresIn,
    student: {
      id: student.id,
      name: student.name,
      classroomId: student.classroomId,
      classroomName: student.classroom?.name ?? null,
    },
  });
}
