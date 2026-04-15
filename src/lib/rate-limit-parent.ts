import "server-only";

// parent-class-invite-v2 — in-memory rate limits for /api/parent/* endpoints.
//
// Three axes for match/code attempts (architecture.md §8.1):
//   • IP        : 5 / 15 min
//   • code      : 50 / 24h
//   • classroom : 100 / 24h
//
// Plus rejection cooldown (architecture.md §8.6):
//   • parentEmail: 3 rejections in 24h → block for 24h
//
// Single-instance in-memory (icn1 region; traffic budget verified in §8.1).
// Upstash migration deferred to a follow-up incident task when traffic ≥ 10x.

const FIFTEEN_MIN_MS = 15 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type Bucket = number[];
const ipHits = new Map<string, Bucket>();
const codeHits = new Map<string, Bucket>();
const classroomHits = new Map<string, Bucket>();
const rejectionHits = new Map<string, Bucket>();

function tick(map: Map<string, Bucket>, key: string, windowMs: number): Bucket {
  const cutoff = Date.now() - windowMs;
  const hits = (map.get(key) ?? []).filter((t) => t > cutoff);
  map.set(key, hits);
  return hits;
}

function consume(map: Map<string, Bucket>, key: string, windowMs: number): void {
  const hits = tick(map, key, windowMs);
  hits.push(Date.now());
  map.set(key, hits);
}

export type MatchAxis = "ip" | "code" | "classroom";

export function checkMatchLimit(
  ip: string | null,
  code: string | null,
  classroomId: string | null
): { ok: true } | { ok: false; axis: MatchAxis; retryAfterSec: number } {
  if (ip) {
    const hits = tick(ipHits, ip, FIFTEEN_MIN_MS);
    if (hits.length >= 5) {
      const oldest = hits[0];
      const retryAfterSec = Math.max(1, Math.ceil((oldest + FIFTEEN_MIN_MS - Date.now()) / 1000));
      return { ok: false, axis: "ip", retryAfterSec };
    }
  }
  if (code) {
    const hits = tick(codeHits, code, ONE_DAY_MS);
    if (hits.length >= 50) {
      const oldest = hits[0];
      const retryAfterSec = Math.max(1, Math.ceil((oldest + ONE_DAY_MS - Date.now()) / 1000));
      return { ok: false, axis: "code", retryAfterSec };
    }
  }
  if (classroomId) {
    const hits = tick(classroomHits, classroomId, ONE_DAY_MS);
    if (hits.length >= 100) {
      const oldest = hits[0];
      const retryAfterSec = Math.max(1, Math.ceil((oldest + ONE_DAY_MS - Date.now()) / 1000));
      return { ok: false, axis: "classroom", retryAfterSec };
    }
  }
  return { ok: true };
}

export function recordMatchAttempt(
  ip: string | null,
  code: string | null,
  classroomId: string | null
): void {
  if (ip) consume(ipHits, ip, FIFTEEN_MIN_MS);
  if (code) consume(codeHits, code, ONE_DAY_MS);
  if (classroomId) consume(classroomHits, classroomId, ONE_DAY_MS);
}

/**
 * Rejection cooldown — checks whether this parentEmail has accumulated ≥3
 * rejections in the last 24h. This is a soft in-memory cache; the authoritative
 * count should be computed from the DB when stricter guarantees are needed.
 */
export function checkRejectionCooldown(
  parentEmail: string
): { ok: true } | { ok: false; retryAfterSec: number } {
  const hits = tick(rejectionHits, parentEmail, ONE_DAY_MS);
  if (hits.length >= 3) {
    const oldest = hits[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + ONE_DAY_MS - Date.now()) / 1000));
    return { ok: false, retryAfterSec };
  }
  return { ok: true };
}

export function recordRejection(parentEmail: string): void {
  consume(rejectionHits, parentEmail, ONE_DAY_MS);
}

// Test-only hook.
export function _resetAllForTests(): void {
  ipHits.clear();
  codeHits.clear();
  classroomHits.clear();
  rejectionHits.clear();
}
