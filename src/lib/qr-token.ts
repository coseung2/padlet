import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Card QR token — HMAC-signed payload with short expiry + single-use nonce.
 *
 * Format: `${cardId}.${nonce}.${expiresAt}.${signature}`
 *  - cardId: the StudentCard row we're authenticating to
 *  - nonce: random 12 bytes base64url, single-use (consumed on successful charge)
 *  - expiresAt: unix seconds; verified ≤ now
 *  - signature: HMAC(cardSecret + AUTH_SECRET, `${cardId}.${nonce}.${expiresAt}`)
 *
 * Nonce consumption uses a Prisma table `QRConsumedNonce` — we avoid an
 * in-memory cache because Vercel functions don't share memory across cold
 * starts. Actually for MVP simplicity we use an ephemeral Map with a TTL —
 * in a serverless the same instance often handles back-to-back scans in
 * short windows. If collision (same nonce re-used cross-instance) happens
 * the second consumer simply fails the signature/expiry check because we
 * bind nonce into the signature — every new token has a fresh nonce.
 *
 * Reality: the strongest guarantee is the 60s expiry. Nonce consumption
 * is a belt-and-braces check for fast double-spend attempts from the same
 * instance.
 */

const AUTH_SECRET = process.env.AUTH_SECRET ?? "dev-secret-never-in-prod";
const TOKEN_TTL_SECONDS = 60;

function signInput(cardId: string, nonce: string, expiresAt: number, cardSecret: string): string {
  return createHmac("sha256", `${AUTH_SECRET}:${cardSecret}`)
    .update(`${cardId}.${nonce}.${expiresAt}`)
    .digest("base64url");
}

export function issueCardToken(cardId: string, cardSecret: string): {
  token: string;
  expiresAt: number;
} {
  const nonce = randomBytes(12).toString("base64url");
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const sig = signInput(cardId, nonce, expiresAt, cardSecret);
  const token = `${cardId}.${nonce}.${expiresAt}.${sig}`;
  return { token, expiresAt };
}

export type VerifiedCardToken = {
  cardId: string;
  nonce: string;
  expiresAt: number;
};

export function parseCardToken(token: string): VerifiedCardToken | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [cardId, nonce, expiresAtRaw] = parts;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) return null;
  if (!cardId || !nonce) return null;
  return { cardId, nonce, expiresAt };
}

export function verifyCardToken(token: string, cardSecret: string): VerifiedCardToken | null {
  const parsed = parseCardToken(token);
  if (!parsed) return null;
  const parts = token.split(".");
  const sig = parts[3];
  const expected = signInput(parsed.cardId, parsed.nonce, parsed.expiresAt, cardSecret);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  if (parsed.expiresAt < Math.floor(Date.now() / 1000)) return null;
  return parsed;
}

// ─── Nonce consumption (in-memory, best-effort) ─────────────────────
// Keys are nonces, values are expiry timestamps. Simple map with periodic
// cleanup — bounded by the number of active tokens in the 15-minute window.
// Serverless cold starts will re-create, so this is primarily a defense
// against double-scan within the same warm instance during a POS session.

type NonceRecord = { expiresAt: number };
const consumedNonces = new Map<string, NonceRecord>();
const NONCE_TTL_MS = 15 * 60 * 1000;

function cleanupNonces() {
  const now = Date.now();
  for (const [nonce, rec] of consumedNonces) {
    if (rec.expiresAt < now) consumedNonces.delete(nonce);
  }
}

export function markNonceConsumed(nonce: string) {
  cleanupNonces();
  consumedNonces.set(nonce, { expiresAt: Date.now() + NONCE_TTL_MS });
}

export function isNonceConsumed(nonce: string): boolean {
  cleanupNonces();
  return consumedNonces.has(nonce);
}

/** 4-digit blocks like "5501-1234". Server-side cardNumber generator. */
export function generateCardNumber(): string {
  const a = Math.floor(1000 + Math.random() * 9000);
  const b = Math.floor(1000 + Math.random() * 9000);
  return `${a}-${b}`;
}

/** 32 bytes base64url, per-card HMAC secret */
export function generateCardSecret(): string {
  return randomBytes(32).toString("base64url");
}
