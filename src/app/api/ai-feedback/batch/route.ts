// POST /api/ai-feedback/batch
// 여러 학생에 대해 한 번에 (단원, 평가항목 — 둘 다 선택) 평어 LLM 호출 + UPSERT.
// 학생마다 generate → save 1 트랜잭션, 결과는 학생별 상태 배열로 반환.
//
// sectionId 가 들어오면 해당 칼럼 안에서 학생이 작성한 카드의 이미지를 찾아
// Gemini Vision 입력으로 함께 보낸다. 비전 미지원 provider(Claude/OpenAI/Ollama)
// 는 v1 에서 텍스트 전용 fallback.
//
// 동시성: provider rate limit / 함수 timeout 보호용 cap = 4. 25명 × 6s / 4 ≈ 38s
// 로 Vercel default 300s 안에서 안전.

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { decryptApiKey } from "@/lib/llm/encryption";
import { getCurrentUser } from "@/lib/auth";
import { buildFeedbackPrompt } from "@/lib/ai-feedback/prompt";
import { generateFeedback, type FeedbackImage } from "@/lib/ai-feedback/generate";
import type { LlmProvider } from "@/lib/llm/stream";

const Body = z.object({
  studentIds: z.array(z.string().min(1)).min(1).max(60),
  subject: z.string().min(1).max(40),
  unit: z.string().max(120).optional().default(""),
  criterion: z.string().max(120).optional().default(""),
  sectionId: z.string().min(1).optional(),
});

const CONCURRENCY = 4;
// Vercel Blob 이미지 fetch 타임아웃 — 비전 한 건이 stalled 돼서 batch 전체가
// 막히는 상황 방지.
const IMAGE_FETCH_TIMEOUT_MS = 5_000;

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

async function fetchImageAsBase64(url: string): Promise<FeedbackImage | null> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), IMAGE_FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mimeType = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim();
    if (!/^image\//i.test(mimeType)) return null;
    return { base64: buf.toString("base64"), mimeType };
  } catch {
    return null;
  }
}

/**
 * 한 학생의 대표 이미지 한 장을 결정.
 * - sectionId 가 주어지면 그 칼럼 안 카드만 후보
 * - 작성자 매칭: CardAuthor.studentId OR Card.studentAuthorId
 * - 우선순위: CardAttachment(kind=image) 의 가장 작은 order → Card.imageUrl
 * - 가장 최근 카드(updatedAt desc) 1개만 사용
 */
async function pickStudentImageUrl(
  studentId: string,
  sectionId: string | undefined
): Promise<string | null> {
  const cards = await db.card.findMany({
    where: {
      ...(sectionId ? { sectionId } : {}),
      OR: [
        { studentAuthorId: studentId },
        { authors: { some: { studentId } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 4, // 최근 4장 중 이미지 있는 첫 카드 사용
    select: {
      imageUrl: true,
      attachments: {
        where: { kind: "image" },
        orderBy: { order: "asc" },
        select: { url: true },
        take: 1,
      },
    },
  });
  for (const c of cards) {
    const attachUrl = c.attachments[0]?.url;
    if (attachUrl) return attachUrl;
    if (c.imageUrl) return c.imageUrl;
  }
  return null;
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
  const visionEnabled = llm.provider === "gemini";

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

  const upfrontFailures: PerStudent[] = orphaned.map((id) => ({
    studentId: id,
    ok: false,
    error: "not_classroom_owner_or_missing",
  }));

  const generated = await runWithConcurrency(validStudents, CONCURRENCY, async (s) => {
    let image: FeedbackImage | null = null;
    if (visionEnabled) {
      const url = await pickStudentImageUrl(s.id, parsed.sectionId);
      if (url) image = await fetchImageAsBase64(url);
    }

    const { systemPrompt, userPrompt } = buildFeedbackPrompt({
      studentName: s.name,
      subject: parsed.subject,
      unit: parsed.unit,
      criterion: parsed.criterion,
      hasImage: !!image,
    });
    const r = await generateFeedback({
      provider: llm.provider,
      apiKey: llm.apiKey,
      baseUrl: llm.baseUrl,
      modelId: llm.modelId,
      systemPrompt,
      userPrompt,
      image,
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
    visionUsed: visionEnabled,
  });
}
