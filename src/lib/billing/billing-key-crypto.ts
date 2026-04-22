// Toss 빌링키 암호화 (Seed 14 follow-up, 2026-04-22).
// LLM Key와 동일한 AES-256-GCM + LLM_KEY_SECRET 파생키를 재사용한다.
// 향후 마스터 키 분리가 필요해지면 여기서만 교체하면 된다.

import "server-only";
import { decryptApiKey, encryptApiKey } from "../llm/encryption";

export function encryptBillingKey(plain: string): string {
  return encryptApiKey(plain);
}

export function decryptBillingKey(payload: string): string {
  return decryptApiKey(payload);
}
