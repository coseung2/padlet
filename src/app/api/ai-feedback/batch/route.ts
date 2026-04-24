// POST /api/ai-feedback/batch
// 여러 학생에 대해 한 번에 (단원, 평가항목 — 둘 다 선택) 평어 LLM 호출 + UPSERT.
// 학생마다 generate → save 1 트랜잭션, 결과는 학생별 상태 배열로 반환.
//
// 동시성: provider rate limit / 함수 timeout 보호용 cap = 4. 25명 × 6s / 4 ≈ 38s
// 로 Vercel default 300s 안에서 안전.

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { decryptApiKey } from "@/lib/llm/encryption";
import { getCurrentUser } from "@/lib/auth";
import { buildFeedbackPrompt } from "@/lib/ai-feedback/prompt";
import { generateFeedback } from "@/lib/ai-feedback/generate";
import type { LlmProvider } from "@/lib/llm/stream";

const Body = z.object({
  studentIds: z.array(z.string().min(1)).min(1).max(60),
  subject: z.string().min(1).max(40),
  unit: z.string().max(120).optional().default(""),
  criterion: z.string().max(120).optional().default(""),
});

const CONCURRENCY = 4;

type PerStudent =
  | { studentId: string; ok: true; comment: string; model: string }
  | { studentId: string; ok: false; error: string };

async function runWithConcurrency<T, R>(
  items: T[],
  cap: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  async function pump() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(cap, items.length) }, pump));
  return results;
}

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

  // 한 번만 LLM Key 로드 — 학생마다 풀면 중복 복호화.
  const keyRow = await db.teacherLlmKey.findUnique({ where: { userId: user.id } });
  if (!keyRow) {
    return NextResponse.json({ error: "ai_key_missing" }, { status: 400 });
  }
  let apiKey = "";
  try {
    apiKey = keyRow.apiKeyEnc ? decryptApiKey(keyRow.apiKeyEnc) : "";
  } catch {
    return NextResponse.json({ error: "ai_key_decrypt_failed" }, { status: 400 });
  }
  const llm = {
    provider: keyRow.provider as LlmProvider,
    apiKey,
    baseUrl: keyRow.baseUrl ?? null,
    modelId: keyRow.modelId ?? null,
  };

  // 한 번만 학생 + classroom 정보 조회 — 학생마다 round-trip 피함.
  const students = await db.student.findMany({
    where: { id: { in: parsed.studentIds } },
    select: {
      id: true,
      name: true,
      number: true,
      classroom: { select: { id: true, teacherId: true } },
    },
  });
  const validStudents = students.filter((s) => s.classroom.teacherId === user.id);
  const validIds = new Set(validStudents.map((s) => s.id));
  const orphaned = parsed.studentIds.filter((id) => !validIds.has(id));

  // 권한 없거나 존재하지 않는 학생 미리 컷.
  const upfrontFailures: PerStudent[] = orphaned.map((id) => ({
    studentId: id,
    ok: false,
    error: "not_classroom_owner_or_missing",
  }));

  const generated = await runWithConcurrency(validStudents, CONCURRENCY, async (s) => {
    const { systemPrompt, userPrompt } = buildFeedbackPrompt({
      studentName: s.name,
      subject: parsed.subject,
      unit: parsed.unit,
      criterion: parsed.criterion,
    });
    const r = await generateFeedback({
      provider: llm.provider,
      apiKey: llm.apiKey,
      baseUrl: llm.baseUrl,
      modelId: llm.modelId,
      systemPrompt,
      userPrompt,
    });
    if (!r.ok) {
      return { studentId: s.id, ok: false, error: r.error } as PerStudent;
    }
    if (!r.text) {
      return { studentId: s.id, ok: false, error: "empty_text" } as PerStudent;
    }
    try {
      await db.aiFeedback.upsert({
        where: {
          studentId_subject_unit_criterion: {
            studentId: s.id,
            subject: parsed.subject,
            unit: parsed.unit,
            criterion: parsed.criterion,
          },
        },
        create: {
          teacherId: user.id,
          classroomId: s.classroom.id,
          studentId: s.id,
          subject: parsed.subject,
          unit: parsed.unit,
          criterion: parsed.criterion,
          comment: r.text,
          model: r.model,
        },
        update: {
          comment: r.text,
          model: r.model,
          teacherId: user.id,
          classroomId: s.classroom.id,
        },
      });
    } catch (e) {
      return { studentId: s.id, ok: false, error: `db: ${(e as Error).message}` } as PerStudent;
    }
    return {
      studentId: s.id,
      ok: true,
      comment: r.text,
      model: r.model,
    } as PerStudent;
  });

  return NextResponse.json({
    results: [...upfrontFailures, ...generated],
  });
}
