import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "crypto";

// Crockford Base32 alphabet — 32 symbols, no ambiguous pairs.
// Excludes: I (looks like 1), L (looks like 1), O (looks like 0), U (profanity).
// Source: https://www.crockford.com/base32.html
// Keep uppercase; normalize user input via normalizeCode().
export const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const CODE_LENGTH = 6;

/**
 * Normalize user-typed code: strip whitespace/hyphens, uppercase,
 * and apply Crockford aliases (I→1, L→1, O→0). Non-alphabet chars remain
 * so verifyCode() will simply fail rather than silently rewriting them.
 */
export function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/I/g, "1")
    .replace(/L/g, "1")
    .replace(/O/g, "0");
}

/**
 * Generate a single Crockford Base32 character using CSPRNG.
 * Uses rejection sampling to avoid modulo bias.
 */
function randomCrockfordChar(): string {
  // 256 / 32 = 8 clean buckets, no bias.
  const buf = randomBytes(1);
  return CROCKFORD_ALPHABET[buf[0] % 32];
}

/**
 * Generate a new 6-char Crockford Base32 code + its sha256 hash.
 * Entropy: 32^6 ≈ 1.07 × 10^9 combinations. Combined with per-code
 * failedAttempts lockout (>=10 → revoke) and 48h expiry, brute-force
 * is infeasible within the attack window.
 */
export function generateCode(): { code: string; codeHash: string } {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += randomCrockfordChar();
  }
  return { code, codeHash: hashCode(code) };
}

export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Timing-safe compare of a user-submitted code (pre-normalize) against
 * the stored hash. Always does equal-length buffer compare regardless of
 * input length to prevent timing side-channel.
 */
export function verifyCode(input: string, storedHash: string): boolean {
  const candidateHash = hashCode(normalizeCode(input));
  const a = Buffer.from(candidateHash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
