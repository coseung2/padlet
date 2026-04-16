/**
 * POST /api/external/pair/exchange
 *
 * 태블릿/네이티브 Canva 앱은 쿠키 공유가 불가능해 Bearer 기반 인증이
 * 필요하다. 학생이 /student/canva-pair 에서 발급받은 짧은 8자 코드를
 * 앱에 입력하면 이 엔드포인트가 one-shot 으로 aurastu_ 액세스 토큰을
 * 반환한다. 코드는 한 번 쓰고 소비(consumedAt 세트) 되므로 재사용 불가.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { issueTokenPairFor } from "@/lib/oauth-server";

export const runtime = "nodejs";
export const maxDuration = 15;

const BodySchema = z.object({
  code: z.string().min(6).max(24),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json" } },
      { status: 400 },
    );
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_code_format" } },
      { status: 400 },
    );
  }
  const code = parsed.data.code.trim().toUpperCase();

  const row = await db.oAuthAuthCode.findUnique({ where: { code } });
  if (!row || row.clientId !== "canva" || row.redirectUri !== "aura://pair") {
    return NextResponse.json(
      { error: { code: "invalid_code" } },
      { status: 404 },
    );
  }
  if (row.consumedAt) {
    return NextResponse.json(
      { error: { code: "code_already_used" } },
      { status: 410 },
    );
  }
  if (row.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: { code: "code_expired" } },
      { status: 410 },
    );
  }

  await db.oAuthAuthCode.update({
    where: { code },
    data: { consumedAt: new Date() },
  });

  const pair = await issueTokenPairFor({
    studentId: row.studentId,
    clientId: "canva",
    scope: row.scope,
  });

  return NextResponse.json({
    token: pair.accessToken,
    expiresIn: pair.expiresIn,
  });
}
