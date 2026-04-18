/**
 * Short HMAC-signed nonce used to carry a verified Canva user id through
 * the Canva OAuth flow without relying on the full JWT being forwarded
 * via `requestAuthorization.queryParams` (which was dropped in practice,
 * likely for length reasons).
 *
 * Flow:
 *   1. Canva app calls POST /api/external/link-start with the Canva JWT
 *      as Bearer. The backend verifies the JWT and returns a short nonce
 *      signed with our AUTH_SECRET.
 *   2. App passes `link_nonce=<nonce>` through requestAuthorization's
 *      queryParams. The string is ~80 bytes so it survives.
 *   3. /oauth/authorize forwards the nonce into the consent form.
 *   4. /api/oauth/consent verifies the nonce's signature, extracts the
 *      canvaUserId, and upserts CanvaAppLink → student.
 */
import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.AUTH_SECRET ?? "dev-secret";
const TTL_MS = 5 * 60 * 1000;

type Payload = {
  canvaUserId: string;
  exp: number;
};

export function signLinkNonce(canvaUserId: string): string {
  const payload: Payload = {
    canvaUserId,
    exp: Date.now() + TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyLinkNonce(nonce: string): Payload | null {
  const [body, sig] = nonce.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString(),
    ) as Payload;
    if (typeof payload.canvaUserId !== "string" || !payload.canvaUserId) {
      return null;
    }
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
