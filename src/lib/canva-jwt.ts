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
const ISSUER = `https://api.canva.com/rest/v1/apps/${APP_ID}`;
const JWKS_URL = `${ISSUER}/jwks`;

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
    issuer: ISSUER,
    audience: APP_ID,
  });
  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("canva_jwt_missing_sub");
  }
  return {
    canvaUserId: payload.sub,
    canvaBrandId:
      typeof payload.brand_id === "string" ? payload.brand_id : undefined,
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
