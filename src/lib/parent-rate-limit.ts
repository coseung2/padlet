import "server-only";
import { createHash } from "crypto";

// In-memory sliding-window rate limiter for parent redeem failures.
// Not multi-instance safe — best-effort soft lock only. The primary guard is
// the DB-backed per-code `failedAttempts` counter (revokes code at 10 fails).
//
// Upgrade path: replace with Upstash Redis when the infra is provisioned
// (see security_audit.md RLS_GAP section for the same infra dependency).

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LIMIT = 5; // 5 failures per IP per window

const buckets = new Map<string, number[]>();

function now(): number {
  return Date.now();
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/**
 * Check + record a failure. Returns true if the caller is locked out
 * BEFORE this call counts (caller should 429 and NOT invoke recordFailure).
 *
 * Call pattern:
 *   if (isIpLocked(ip)) return 429;
 *   ... do verify work ...
 *   if (failed) recordIpFailure(ip);
 */
export function isIpLocked(ip: string | null | undefined): boolean {
  if (!ip) return false;
  const cutoff = now() - WINDOW_MS;
  const hits = (buckets.get(ip) ?? []).filter((t) => t > cutoff);
  if (hits.length !== (buckets.get(ip) ?? []).length) buckets.set(ip, hits);
  return hits.length >= LIMIT;
}

export function recordIpFailure(ip: string | null | undefined): void {
  if (!ip) return;
  const cutoff = now() - WINDOW_MS;
  const hits = (buckets.get(ip) ?? []).filter((t) => t > cutoff);
  hits.push(now());
  buckets.set(ip, hits);
}

/**
 * Read the best-effort client IP from common proxy headers. Supabase/Vercel
 * set x-forwarded-for. Tests may stub via x-real-ip.
 */
export function extractClientIp(req: Request): string | null {
  const h = req.headers;
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = h.get("x-real-ip");
  if (xri) return xri.trim();
  return null;
}

// Testing / cleanup hook — not exported for app code.
export function _resetBucketsForTests() {
  buckets.clear();
}
