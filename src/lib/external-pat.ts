/**
 * Personal Access Token (PAT) — Seed 8 format.
 *
 * Format: `aurapat_{8-char base62 prefix}_{40-char base64url secret}`.
 * Regex (secret-scanner compatible): ^aurapat_[0-9a-zA-Z]{8}_[0-9a-zA-Z_-]{40}$
 *
 * Security model:
 *   • tokenPrefix persisted for O(1) DB lookup (@unique).
 *   • tokenHash = SHA-256(secret ‖ AURA_PAT_PEPPER). Plaintext never persisted.
 *   • Verification runs in constant time — if prefix miss, a dummy SHA-256 +
 *     timingSafeEqual against a stable zero-hash is executed to avoid leaking
 *     whether the prefix existed via timing channels.
 *   • Legacy rows (tokenPrefix=null, tokenHash produced by the v1 salt scheme)
 *     are rejected by the new verifier; they must be revoked+reissued in the
 *     3-stage migration documented in MIGRATION_PLAN.md.
 *   • PEPPER rotation ⇒ invalidates every token.
 *
 * The lib exposes a focused surface: issue / verify / revoke / list + small
 * helpers for the teacher UI and route handlers.
 */
import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type { User } from "@prisma/client";
import { db } from "./db";

export const TOKEN_FULL_PREFIX = "aurapat_";
export const TOKEN_PREFIX_LEN = 8;
export const TOKEN_SECRET_LEN = 40;
export const TOKEN_CAP_PER_USER = 10;
// ^aurapat_{8 base62}_{40 base62/url-safe}$
export const TOKEN_REGEX = /^aurapat_[0-9A-Za-z]{8}_[0-9A-Za-z_-]{40}$/;

const DUMMY_HASH = createHash("sha256").update("aurapat:dummy:v1").digest("hex");

function pepper(): string {
  const p = process.env.AURA_PAT_PEPPER;
  if (!p || p.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AURA_PAT_PEPPER required (≥32 chars) to hash external tokens"
      );
    }
    // Dev fallback — deterministic within a single process so that locally
    // issued tokens verify. Fail-loud in prod build.
    return "aura-dev-pepper-fallback-ge-32-chars-for-local-use-only";
  }
  return p;
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(`${secret}:${pepper()}`).digest("hex");
}

// base62 alphabet for the 8-char prefix (GitHub secret-scanner compatible).
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function base62(len: number): string {
  const buf = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += BASE62[buf[i] % 62];
  return out;
}

function generateSecret(): { prefix: string; secret: string; full: string } {
  const prefix = base62(TOKEN_PREFIX_LEN);
  // base64url → 40 chars safe; replace + and / just in case.
  const raw = randomBytes(30).toString("base64url").slice(0, TOKEN_SECRET_LEN);
  const secret = raw.padEnd(TOKEN_SECRET_LEN, "A"); // defensive pad
  return { prefix, secret, full: `${TOKEN_FULL_PREFIX}${prefix}_${secret}` };
}

export function maskFullToken(prefix: string): string {
  // Shown in list views — never the full secret.
  return `${TOKEN_FULL_PREFIX}${prefix}_${"•".repeat(8)}…`;
}

// ─── Token lifecycle ──────────────────────────────────────────────────────

export type IssueResult = {
  id: string;
  prefix: string;
  /** Full `aurapat_...` — returned ONCE to the teacher UI. Never re-retrievable. */
  fullToken: string;
  createdAt: Date;
  expiresAt: Date | null;
};

export type ListedToken = {
  id: string;
  name: string;
  tokenPrefix: string | null;
  scopes: string[];
  scopeBoardIds: string[];
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date | null;
};

function csvToArr(v: string | null | undefined): string[] {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function listTokens(userId: string): Promise<ListedToken[]> {
  const rows = await db.externalAccessToken.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      scopes: true,
      scopeBoardIds: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
      expiresAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    tokenPrefix: r.tokenPrefix ?? null,
    scopes: csvToArr(r.scopes),
    scopeBoardIds: csvToArr(r.scopeBoardIds),
    createdAt: r.createdAt,
    lastUsedAt: r.lastUsedAt,
    revokedAt: r.revokedAt,
    expiresAt: r.expiresAt,
  }));
}

export async function countActiveTokens(userId: string): Promise<number> {
  return db.externalAccessToken.count({
    where: { userId, revokedAt: null },
  });
}

export type IssueInput = {
  userId: string;
  name: string;
  scopes?: string[]; // v1 restricted to ["cards:write"]
  scopeBoardIds?: string[];
  /** Expiry in days, null = unlimited. Default 90. */
  expiresInDays?: number | null;
};

export async function issuePat(input: IssueInput): Promise<IssueResult> {
  const name = (input.name ?? "").trim();
  if (!name || name.length > 100) {
    const e = new Error("invalid_name") as Error & { code?: string };
    e.code = "invalid_name";
    throw e;
  }
  const active = await countActiveTokens(input.userId);
  if (active >= TOKEN_CAP_PER_USER) {
    const e = new Error("token_limit_exceeded") as Error & { code?: string };
    e.code = "token_limit_exceeded";
    throw e;
  }
  const scopes = (input.scopes ?? ["cards:write"]).filter(Boolean);
  if (scopes.length === 0 || scopes.some((s) => s !== "cards:write")) {
    const e = new Error("invalid_scope") as Error & { code?: string };
    e.code = "invalid_scope";
    throw e;
  }
  const expiresInDays = input.expiresInDays === undefined ? 90 : input.expiresInDays;
  const expiresAt =
    expiresInDays === null
      ? null
      : new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  // Retry once on the remote (≪ 1e-15) chance of prefix collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { prefix, secret, full } = generateSecret();
    const tokenHash = hashSecret(secret);
    try {
      const row = await db.externalAccessToken.create({
        data: {
          userId: input.userId,
          name,
          tokenPrefix: prefix,
          tokenHash,
          scopes: scopes.join(","),
          scopeBoardIds: (input.scopeBoardIds ?? []).join(","),
          expiresAt,
        },
        select: { id: true, createdAt: true, expiresAt: true },
      });
      return {
        id: row.id,
        prefix,
        fullToken: full,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
      };
    } catch (e) {
      // Unique violation on tokenPrefix/hash → retry.
      const code = (e as { code?: string }).code;
      if (code === "P2002") continue;
      throw e;
    }
  }
  throw new Error("pat_issue_retry_exhausted");
}

export async function revokePat(id: string, userId: string): Promise<boolean> {
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

// ─── Verification ─────────────────────────────────────────────────────────

export type VerifiedPat = {
  user: User;
  tokenId: string;
  tokenPrefix: string;
  scopes: string[];
  scopeBoardIds: string[];
};

export function parseBearer(header: string | null): { prefix: string; secret: string } | null {
  if (!header) return null;
  const m = /^bearer\s+(\S+)\s*$/i.exec(header.trim());
  if (!m) return null;
  const token = m[1];
  if (!TOKEN_REGEX.test(token)) return null;
  // Split on the SECOND underscore boundary: aurapat_{prefix}_{secret}
  const rest = token.slice(TOKEN_FULL_PREFIX.length);
  const sep = rest.indexOf("_");
  if (sep !== TOKEN_PREFIX_LEN) return null;
  const prefix = rest.slice(0, sep);
  const secret = rest.slice(sep + 1);
  if (secret.length !== TOKEN_SECRET_LEN) return null;
  return { prefix, secret };
}

function hashesEqualCT(aHex: string, bHex: string): boolean {
  if (aHex.length !== bHex.length) return false;
  try {
    return timingSafeEqual(Buffer.from(aHex, "hex"), Buffer.from(bHex, "hex"));
  } catch {
    return false;
  }
}

/**
 * Outcome type lets the route handler distinguish 401 variants (format vs
 * unknown vs hash mismatch) from 410 (revoked/expired) without additional
 * DB round-trips.
 */
export type VerifyOutcome =
  | { ok: true; value: VerifiedPat }
  | { ok: false; code: "invalid_token_format" | "invalid_token" | "token_revoked" };

export async function verifyPat(header: string | null): Promise<VerifyOutcome> {
  const parsed = parseBearer(header);
  if (!parsed) {
    // Still burn a dummy hash to keep timing uniform.
    hashesEqualCT(DUMMY_HASH, DUMMY_HASH);
    return { ok: false, code: "invalid_token_format" };
  }
  const candidate = hashSecret(parsed.secret);
  const row = await db.externalAccessToken.findUnique({
    where: { tokenPrefix: parsed.prefix },
    include: { user: true },
  });
  if (!row) {
    // Prefix miss → dummy compare to pad timing (R5 side-channel).
    hashesEqualCT(candidate, DUMMY_HASH);
    return { ok: false, code: "invalid_token" };
  }
  if (!hashesEqualCT(row.tokenHash, candidate)) {
    return { ok: false, code: "invalid_token" };
  }
  if (row.revokedAt) return { ok: false, code: "token_revoked" };
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    return { ok: false, code: "token_revoked" };
  }
  // Best-effort audit — do not block request.
  db.externalAccessToken
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch(() => void 0);
  return {
    ok: true,
    value: {
      user: row.user,
      tokenId: row.id,
      tokenPrefix: row.tokenPrefix!,
      scopes: csvToArr(row.scopes),
      scopeBoardIds: csvToArr(row.scopeBoardIds),
    },
  };
}

// ─── Test hooks ───────────────────────────────────────────────────────────

export const __test__ = {
  generateSecret,
  hashSecret,
  DUMMY_HASH,
};
