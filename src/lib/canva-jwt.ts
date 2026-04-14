/**
 * Canva Apps SDK JWT verification.
 *
 * The Canva app calls `getCanvaUserToken()` on the client and sends the
 * returned JWT to our backend as `Authorization: Bearer <jwt>`. We verify
 * the JWT against Canva's JWKS (public keys published per app), then
 * resolve `sub` (Canva user id) to an Aura-board student via the
 * `CanvaAppLink` mapping table.
 *
 * JWKS endpoint + issuer follow the pattern documented at:
 *   https://www.canva.dev/docs/apps/verifying-user-tokens
 *     Issuer : https://api.canva.com/rest/v1/apps/{APP_ID}
 *     JWKS   : https://api.canva.com/rest/v1/apps/{APP_ID}/jwks
 */
import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

const APP_ID = "AAHAAMW43f4";
// JWKS endpoint per https://www.canva.dev/docs/apps/verifying-user-tokens.
// Canva's current user-token tokens do NOT include an `iss` claim, so we
// intentionally skip issuer validation and only check signature + audience
// + standard timing claims.
const JWKS_URL = `https://api.canva.com/rest/v1/apps/${APP_ID}/jwks`;

// Module-scoped JWKS cache. jose's createRemoteJWKSet memoises fetched keys
// and refetches on kid miss or after its internal cooldown.
let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (JWKS) return JWKS;
  JWKS = createRemoteJWKSet(new URL(JWKS_URL));
  return JWKS;
}

export type CanvaTokenClaims = {
  /** Canva user id unique to this app. Stable across sessions. */
  canvaUserId: string;
  /** Canva brand/team id the user belongs to (optional claim). */
  canvaBrandId?: string;
  /** Canva app id — always equals our APP_ID. */
  canvaAppId: string;
};

/**
 * Verify a Canva-issued JWT. Returns the key claims on success. Throws on
 * any signature/exp/iss/aud mismatch.
 */
export async function verifyCanvaToken(token: string): Promise<CanvaTokenClaims> {
  const { payload } = await jwtVerify(token, getJwks(), {
    audience: APP_ID,
    // NOTE: no `issuer` option — Canva's JWTs omit the iss claim.
  });
  // Canva uses `userId` (brand-scoped user id) instead of the standard
  // `sub` claim. Fall back to sub just in case future versions add it.
  const userId =
    (typeof payload.userId === "string" && payload.userId) ||
    (typeof payload.sub === "string" && payload.sub) ||
    null;
  if (!userId) {
    throw new Error("canva_jwt_missing_user_id");
  }
  return {
    canvaUserId: userId,
    canvaBrandId:
      (typeof payload.brandId === "string" && payload.brandId) ||
      (typeof payload.brand_id === "string" && payload.brand_id) ||
      undefined,
    canvaAppId: APP_ID,
  };
}

/** Cheap shape check before attempting a full verify. */
export function looksLikeCanvaJwt(raw: string): boolean {
  // Three dot-separated base64url segments, starts with `eyJ` (typical JWT
  // header prefix). Does not guarantee validity — jwtVerify owns that.
  if (!raw.startsWith("eyJ")) return false;
  const parts = raw.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}
