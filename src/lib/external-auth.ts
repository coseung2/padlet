/**
 * External Access Token (PAT) for the Content-Publisher integration (P0-②).
 *
 * Security model:
 *   • Plaintext token format: `aura_pat_<22 base64url>` (~132 bits entropy).
 *   • Only a keyed SHA-256 hash of the full plaintext is persisted. Salt =
 *     `NEXTAUTH_SECRET` (so rotating the secret invalidates all tokens).
 *   • verifyToken() always computes the hash before any DB lookup, so the
 *     response time does not reveal whether the token "looked valid". The
 *     lookup itself is a single indexed `findUnique` on the unique hash
 *     column; we additionally run a timingSafeEqual on the stored hash to
 *     defend against any future non-constant-time comparison upstream.
 *   • Revocation is soft (`revokedAt`), preserving an audit trail.
 *
 * Rate limiting is per-tokenId, fixed-window, in-memory — acceptable for a
 * single-instance solo-teacher deployment; documented in scope_decision.
 */
import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type { User } from "@prisma/client";
import { db } from "./db";

export const TOKEN_PREFIX = "aura_pat_";
const TOKEN_BODY_LEN = 22; // base64url chars -> ~132 bits
export const TOKEN_CAP_PER_USER = 10;
export const RATE_LIMIT_PER_MIN = 60;
const RATE_WINDOW_MS = 60_000;

function secretSalt(): string {
  // Using NEXTAUTH_SECRET as the key for the hash means hashes are only
  // verifiable on servers that share the secret. Also gives us "revoke all"
  // by rotating the secret.
  const s = process.env.NEXTAUTH_SECRET;
  if (!s || s.length < 16) {
    // In dev without a secret configured we still want deterministic hashes
    // within a single process. Fail loud in prod build.
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXTAUTH_SECRET required to hash external tokens");
    }
    return "aura-dev-fallback-secret";
  }
  return s;
}

export function hashToken(plain: string): string {
  return createHash("sha256").update(`${secretSalt()}:${plain}`).digest("hex");
}

export function maskToken(raw: string): string {
  if (!raw) return "";
  const tail = raw.slice(-4);
  return `${TOKEN_PREFIX}********${tail}`;
}

function generatePlaintext(): string {
  // 16 raw bytes -> 22 base64url chars
  const body = randomBytes(16).toString("base64url").slice(0, TOKEN_BODY_LEN);
  return `${TOKEN_PREFIX}${body}`;
}

// ─── Token lifecycle ───────────────────────────────────────────────────────

export async function listTokens(userId: string) {
  return db.externalAccessToken.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
  });
}

export async function countActiveTokens(userId: string): Promise<number> {
  return db.externalAccessToken.count({
    where: { userId, revokedAt: null },
  });
}

export async function issueToken(
  userId: string,
  name: string
): Promise<{ id: string; token: string; createdAt: Date }> {
  const trimmed = (name ?? "").trim();
  if (!trimmed || trimmed.length > 100) {
    throw new Error("invalid_name");
  }
  const active = await countActiveTokens(userId);
  if (active >= TOKEN_CAP_PER_USER) {
    const e = new Error("token_limit_exceeded");
    (e as Error & { code?: string }).code = "token_limit_exceeded";
    throw e;
  }
  const token = generatePlaintext();
  const tokenHash = hashToken(token);
  const row = await db.externalAccessToken.create({
    data: { userId, name: trimmed, tokenHash },
    select: { id: true, createdAt: true },
  });
  return { id: row.id, token, createdAt: row.createdAt };
}

export async function revokeToken(id: string, userId: string): Promise<boolean> {
  // Scope revoke to owning user so cross-user revoke is impossible even with
  // a guessed id.
  const row = await db.externalAccessToken.findFirst({
    where: { id, userId },
    select: { id: true, revokedAt: true },
  });
  if (!row || row.revokedAt) return false;
  await db.externalAccessToken.update({
    where: { id: row.id },
    data: { revokedAt: new Date() },
  });
  return true;
}

// ─── Verification ──────────────────────────────────────────────────────────

export type VerifiedToken = {
  user: User;
  tokenId: string;
};

function parseBearer(header: string | null): string | null {
  if (!header) return null;
  const trimmed = header.trim();
  // Accept "Bearer <token>" case-insensitively.
  const m = /^bearer\s+(\S+)\s*$/i.exec(trimmed);
  if (!m) return null;
  const token = m[1];
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  return token;
}

function hashesEqualCT(aHex: string, bHex: string): boolean {
  if (aHex.length !== bHex.length) return false;
  try {
    return timingSafeEqual(Buffer.from(aHex, "hex"), Buffer.from(bHex, "hex"));
  } catch {
    return false;
  }
}

export async function verifyToken(
  header: string | null
): Promise<VerifiedToken | null> {
  const plain = parseBearer(header);
  if (!plain) return null;
  const candidate = hashToken(plain);
  const row = await db.externalAccessToken.findUnique({
    where: { tokenHash: candidate },
    include: { user: true },
  });
  if (!row) return null;
  if (row.revokedAt) return null;
  if (!hashesEqualCT(row.tokenHash, candidate)) return null;
  // Fire-and-forget touch; don't block the request if it fails.
  db.externalAccessToken
    .update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => void 0);
  return { user: row.user, tokenId: row.id };
}

// ─── Rate limiting (in-memory, per-instance) ───────────────────────────────

type Bucket = { count: number; windowStart: number };
const buckets = new Map<string, Bucket>();

export function checkRateLimit(tokenId: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(tokenId);
  if (!b || now - b.windowStart >= RATE_WINDOW_MS) {
    buckets.set(tokenId, { count: 1, windowStart: now });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count < RATE_LIMIT_PER_MIN) {
    b.count += 1;
    return { ok: true, retryAfter: 0 };
  }
  const retryAfter = Math.max(
    1,
    Math.ceil((RATE_WINDOW_MS - (now - b.windowStart)) / 1000)
  );
  return { ok: false, retryAfter };
}

// Exported for tests only.
export const __test__ = {
  resetBuckets: () => buckets.clear(),
};
