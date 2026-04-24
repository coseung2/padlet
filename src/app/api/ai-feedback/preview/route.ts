// POST /api/ai-feedback/preview
// 평어 텍스트만 생성 (DB 저장 X). 모달에서 미리보기/재생성에 사용.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { resolveFeedbackContextByStudent } from "@/lib/ai-feedback/auth";
import { buildFeedbackPrompt } from "@/lib/ai-feedback/prompt";
import { generateFeedback } from "@/lib/ai-feedback/generate";

const Body = z.object({
  studentId: z.string().min(1),
  subject: z.string().min(1).max(40),
  unit: z.string().max(120).optional().default(""),
  criterion: z.string().max(120).optional().default(""),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
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

  const { systemPrompt, userPrompt } = buildFeedbackPrompt({
    studentName: ctx.studentName,
    subject: parsed.subject,
    unit: parsed.unit,
    criterion: parsed.criterion,
  });

  const result = await generateFeedback({
    provider: ctx.llm.provider,
    apiKey: ctx.llm.apiKey,
    baseUrl: ctx.llm.baseUrl,
    modelId: ctx.llm.modelId,
    systemPrompt,
    userPrompt,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "llm_failed", detail: result.error }, { status: 502 });
  }

  return NextResponse.json({ comment: result.text, model: result.model });
}
