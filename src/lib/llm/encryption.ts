// Teacher LLM API Key 암호화 (Seed 13 follow-up).
// AES-256-GCM — payload format: base64(iv[12] || authTag[16] || ciphertext).
//
// 키 소스:
//   1) LLM_KEY_SECRET (권장) — 32바이트 이상 랜덤 문자열
//   2) AUTH_SECRET       — fallback (기존 세션 시크릿 재사용)
//   3) dev placeholder    — 로컬 개발 전용
//
// 두 옵션 모두 SHA-256으로 해시해 32바이트 대칭키로 파생한다. LLM_KEY_SECRET을
// 회전하면 기존에 저장된 Key는 복호화 실패 → UI에서 "오류, 다시 저장" 유도.

import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function deriveKey(): Buffer {
  const raw =
    process.env.LLM_KEY_SECRET ??
    process.env.AUTH_SECRET ??
    "dev-llm-key-never-in-prod";
  return createHash("sha256").update(raw).digest(); // 32 bytes
}

export function encryptApiKey(plain: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, deriveKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptApiKey(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error("llm-key: ciphertext too short");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, deriveKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function last4(plain: string): string {
  const trimmed = plain.trim();
  return trimmed.length <= 4 ? trimmed : trimmed.slice(-4);
}
