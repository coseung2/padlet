/**
 * Event-signup token utilities.
 *
 * - issueToken: generates URL-safe random string (21 chars) using node crypto.
 *   Equivalent strength to nanoid(21). No new dependency.
 * - tokensEqual: timing-safe compare. Mirrors src/lib/rbac.ts#tokensEqual
 *   so we don't export across modules (keep rbac internal).
 * - hashIp: salted sha-256 for spam throttling. Salt falls back to NEXTAUTH_SECRET
 *   when IP_HASH_SALT is unset (still provides per-deploy entropy).
 */
import { randomBytes, createHash, timingSafeEqual } from "crypto";

export function issueToken(): string {
  // 16 raw bytes → 22 base64url chars; slice to 21 for consistency with nanoid(21).
  return randomBytes(16).toString("base64url").slice(0, 21);
}

export function tokensEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || process.env.NEXTAUTH_SECRET || "aura-fallback-salt";
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex");
}

export function getIpFromRequest(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "0.0.0.0";
}
