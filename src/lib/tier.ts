/**
 * Tier gating — dual-defense (Seed 8 D11).
 *
 * The full User.tier column is deferred to a follow-up task. MVP reads
 * `FREE_USER_IDS` (comma-sep env) and treats those as Free; everyone else is
 * Pro. Both the token issue endpoint AND `/api/external/cards` must call
 * `requireProTier(userId)` to enforce R7 (Free strip-down after issuance).
 *
 * Set TIER_MODE=free at boot to force every caller into Free for QA/testing.
 */
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

export class TierRequiredError extends Error {
  code = "tier_required" as const;
  upgradeUrl = "https://aura-board-app.vercel.app/pricing";
  constructor(message = "Pro tier required") {
    super(message);
    this.name = "TierRequiredError";
  }
}

export function requireProTier(userId?: string | null): void {
  if (!isProTier(userId)) throw new TierRequiredError();
}

export function canUseTemplate(tier: Tier, requiresPro: boolean): boolean {
  if (!requiresPro) return true;
  return tier === "pro";
}
