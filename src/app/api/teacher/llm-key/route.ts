// Teacher LLM API Key CRUD (Seed 13 follow-up, 2026-04-22).
//
// GET    /api/teacher/llm-key    — 현재 저장 상태 조회 (provider, last4, verified, verifiedAt, lastError)
// POST   /api/teacher/llm-key    — provider + apiKey 저장 + 즉시 검증 호출
// DELETE /api/teacher/llm-key    — 삭제
//
// 실제 apiKey 원문은 응답으로 내보내지 않고 last4만 돌려준다.

import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { encryptApiKey, last4 } from "@/lib/llm/encryption";
import { verifyApiKey, type LlmProvider } from "@/lib/llm/stream";

const PROVIDERS = ["claude", "openai", "gemini"] as const;

const SaveSchema = z.object({
  provider: z.enum(PROVIDERS),
  apiKey: z.string().trim().min(8).max(500),
});

function keyShapeOk(provider: LlmProvider, key: string): boolean {
  // 가벼운 sanity check. 형식이 완전하지 않아도 검증은 verifyApiKey가 처리.
  if (provider === "claude") return key.startsWith("sk-ant-");
  if (provider === "openai") return key.startsWith("sk-");
  if (provider === "gemini") return key.startsWith("AIza") || key.length >= 30;
  return false;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }
  const row = await db.teacherLlmKey.findUnique({ where: { userId: user.id } });
  if (!row) {
    return new Response(JSON.stringify({ present: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(
    JSON.stringify({
      present: true,
      provider: row.provider,
      last4: row.last4,
      verified: row.verified,
      verifiedAt: row.verifiedAt,
      lastError: row.lastError,
      updatedAt: row.updatedAt,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = SaveSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "bad_request", detail: parsed.error.issues }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { provider, apiKey } = parsed.data;
  if (!keyShapeOk(provider, apiKey)) {
    return new Response(
      JSON.stringify({ error: "key_shape_mismatch", detail: `${provider} key prefix not recognized` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const verifyResult = await verifyApiKey(provider, apiKey);
  const verified = verifyResult.ok;
  const lastError = verifyResult.ok ? null : verifyResult.error;

  const enc = encryptApiKey(apiKey);
  const tail = last4(apiKey);

  const saved = await db.teacherLlmKey.upsert({
    where: { userId: user.id },
    update: {
      provider,
      apiKeyEnc: enc,
      last4: tail,
      verified,
      verifiedAt: verified ? new Date() : null,
      lastError,
    },
    create: {
      userId: user.id,
      provider,
      apiKeyEnc: enc,
      last4: tail,
      verified,
      verifiedAt: verified ? new Date() : null,
      lastError,
    },
  });

  return new Response(
    JSON.stringify({
      present: true,
      provider: saved.provider,
      last4: saved.last4,
      verified: saved.verified,
      verifiedAt: saved.verifiedAt,
      lastError: saved.lastError,
      updatedAt: saved.updatedAt,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }
  await db.teacherLlmKey.deleteMany({ where: { userId: user.id } });
  return new Response(JSON.stringify({ present: false }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
