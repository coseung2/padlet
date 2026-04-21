/**
 * Tier gating — dual-defense (Seed 8 D11, extended Seed 14).
 *
 * Resolution order:
 *   1) TIER_MODE env (=free|pro) — wins for QA / staging forceruns
 *   2) FREE_USER_IDS env allowlist — hard-force a user to Free
 *   3) DB TeacherSubscription (getTierFromDb) — Pro if active+period valid
 *   4) Fallback default = Pro (solo-teacher deployments before billing wiring)
 *
 * Sync variant `isProTier` keeps the env-only behavior so existing callers
 * (e.g. board-create handlers that can't await) keep working. New code that
 * can await should prefer `isProTierAsync` which reflects the DB subscription.
 *
 * Set TIER_MODE=free at boot to force every caller into Free for QA/testing.
 */
import { getSubscriptionSnapshot } from "./billing/subscription";

export type Tier = "free" | "pro";

export function getCurrentTier(userId?: string | null): Tier {
  if (process.env.TIER_MODE === "free") return "free";
  if (process.env.TIER_MODE === "pro") return "pro";
  const ids = (process.env.FREE_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (userId && ids.includes(userId)) return "free";
  // Default = Pro when no allowlist configured (solo-teacher deployment).
  return "pro";
}

export function isProTier(userId?: string | null): boolean {
  return getCurrentTier(userId) === "pro";
}

/**
 * DB-aware variant. Returns the resolved tier honoring both env overrides
 * and the TeacherSubscription table.
 */
export async function getCurrentTierAsync(
  userId?: string | null,
): Promise<Tier> {
  // Env overrides keep priority so test runs are deterministic.
  if (process.env.TIER_MODE === "free") return "free";
  if (process.env.TIER_MODE === "pro") return "pro";

  const ids = (process.env.FREE_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (userId && ids.includes(userId)) return "free";

  if (!userId) return "pro"; // mirror sync default for anon
  const snap = await getSubscriptionSnapshot(userId);
  return snap.isPro ? "pro" : "free";
}

export async function isProTierAsync(userId?: string | null): Promise<boolean> {
  return (await getCurrentTierAsync(userId)) === "pro";
}

export class TierRequiredError extends Error {
  code = "tier_required" as const;
  upgradeUrl = "/billing";
  constructor(message = "Pro tier required") {
    super(message);
    this.name = "TierRequiredError";
  }
}

export function requireProTier(userId?: string | null): void {
  if (!isProTier(userId)) throw new TierRequiredError();
}

export async function requireProTierAsync(userId?: string | null): Promise<void> {
  if (!(await isProTierAsync(userId))) throw new TierRequiredError();
}

export function canUseTemplate(tier: Tier, requiresPro: boolean): boolean {
  if (!requiresPro) return true;
  return tier === "pro";
}
