// 평어 라우트 공통 — 교사 식별 + 학생/교실 owner 검증 + 교사 LLM Key 로드.

import "server-only";
import { db } from "../db";
import { decryptApiKey } from "../llm/encryption";
import type { LlmProvider } from "../llm/stream";

export type ResolvedFeedbackContext = {
  teacherId: string;
  classroomId: string;
  studentId: string;
  studentName: string;
  studentNumber: number | null;
  classroomCode: string;
  llm: { provider: LlmProvider; apiKey: string; baseUrl: string | null; modelId: string | null };
};

/**
 * 학생 ID 로부터 컨텍스트(교실·교사·LLM key) 를 묶어 반환.
 * - 학생이 존재하지 않거나 교사가 해당 교실 owner 가 아니면 throw.
 * - 교사 LLM Key 가 없거나 복호화 실패 시 throw ("ai_key_missing").
 */
export async function resolveFeedbackContextByStudent(
  teacherUserId: string,
  studentId: string
): Promise<ResolvedFeedbackContext> {
  const student = await db.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
      number: true,
      classroom: { select: { id: true, code: true, teacherId: true } },
    },
  });
  if (!student) throw new Error("student_not_found");
  if (student.classroom.teacherId !== teacherUserId) {
    throw new Error("not_classroom_owner");
  }

  const keyRow = await db.teacherLlmKey.findUnique({ where: { userId: teacherUserId } });
  if (!keyRow) throw new Error("ai_key_missing");
  let apiKey = "";
  try {
    apiKey = keyRow.apiKeyEnc ? decryptApiKey(keyRow.apiKeyEnc) : "";
  } catch {
    throw new Error("ai_key_decrypt_failed");
  }

  return {
    teacherId: teacherUserId,
    classroomId: student.classroom.id,
    studentId: student.id,
    studentName: student.name,
    studentNumber: student.number,
    classroomCode: student.classroom.code,
    llm: {
      provider: keyRow.provider as LlmProvider,
      apiKey,
      baseUrl: keyRow.baseUrl ?? null,
      modelId: keyRow.modelId ?? null,
    },
  };
}
