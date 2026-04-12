/**
 * Tier gating — Breakout foundation stub.
 *
 * The full Tier/billing entity does not yet exist (roadmap item). Until it
 * lands, all users are treated as `free` unless TIER_MODE=pro is set in the
 * environment. BR-5/6 agents will replace this with a real User.tier field.
 *
 * Server routes and UIs MUST import `getCurrentTier()` rather than hard-coding
 * "free" so that the swap is a single-file change.
 */
export type Tier = "free" | "pro";

export function getCurrentTier(_userId?: string | null): Tier {
  const mode = process.env.TIER_MODE;
  if (mode === "pro") return "pro";
  return "free";
}

export function canUseTemplate(tier: Tier, requiresPro: boolean): boolean {
  if (!requiresPro) return true;
  return tier === "pro";
}
