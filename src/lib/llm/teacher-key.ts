// 교사 LLM Key 조회·해석 헬퍼 (Seed 13 follow-up).
// vibe-arcade 세션 라우트에서 boardId → classroom.teacherId → TeacherLlmKey를
// 풀어 복호화된 {provider, apiKey}를 돌려준다.

import "server-only";
import { db } from "../db";
import { decryptApiKey } from "./encryption";
import type { LlmProvider } from "./stream";

export type ResolvedTeacherKey = {
  provider: LlmProvider;
  apiKey: string;
  baseUrl: string | null;
  modelId: string | null;
};

/**
 * boardId로부터 소유 교사의 LLM Key를 복호화해 반환.
 * - board에 classroom이 없으면 null
 * - 교사가 아직 Key를 저장하지 않았으면 null
 * - 복호화 실패(예: LLM_KEY_SECRET 회전 후)도 null
 */
export async function getTeacherKeyForBoard(
  boardId: string,
): Promise<ResolvedTeacherKey | null> {
  const board = await db.board.findUnique({
    where: { id: boardId },
    select: {
      classroom: { select: { teacherId: true } },
    },
  });
  const teacherId = board?.classroom?.teacherId;
  if (!teacherId) return null;

  const row = await db.teacherLlmKey.findUnique({ where: { userId: teacherId } });
  if (!row) return null;

  try {
    // ollama 는 apiKey 가 비어있을 수 있음 — 빈 암호문도 허용.
    const apiKey = row.apiKeyEnc ? decryptApiKey(row.apiKeyEnc) : "";
    return {
      provider: row.provider as LlmProvider,
      apiKey,
      baseUrl: row.baseUrl ?? null,
      modelId: row.modelId ?? null,
    };
  } catch {
    return null;
  }
}
