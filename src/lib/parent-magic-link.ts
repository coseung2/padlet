import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

// HMAC-signed magic-link token for parent auth.
// Format:  base64url(payloadJSON) "." base64url(hmac-sha256(payload, SECRET))
// Payload: { parentId: string, exp: number /* ms-since-epoch */ }
// TTL: 15 minutes by default. A replay within TTL merely issues another
// ParentSession for the same parent — acceptable (no privilege escalation).

const SECRET = process.env.AUTH_SECRET ?? "dev-secret";
const DEFAULT_TTL_MS = 15 * 60 * 1000;

interface MagicLinkPayload {
  parentId: string;
  exp: number;
}

export function signMagicLink(parentId: string, ttlMs: number = DEFAULT_TTL_MS): string {
  const payload: MagicLinkPayload = {
    parentId,
    exp: Date.now() + ttlMs,
  };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyMagicLink(token: string): { parentId: string } | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;
  if (!b64 || !sig) return null;

  const expected = createHmac("sha256", SECRET).update(b64).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  try {
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString()) as MagicLinkPayload;
    if (typeof payload.parentId !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return { parentId: payload.parentId };
  } catch {
    return null;
  }
}

/**
 * Dispatch a magic link. In v1 the email backend is deferred to a follow-up
 * agent (PV-10 uses Resend for the weekly summary; that infra will be reused
 * here). Until then, when `PARENT_EMAIL_ENABLED !== "true"`, return the URL
 * to the caller so dev flows + manual QA can proceed.
 *
 * Production operators MUST set PARENT_EMAIL_ENABLED=true + wire Resend before
 * go-live. See tasks/.../phase10/deploy_log.md for the checklist.
 */
export async function dispatchMagicLink(
  email: string,
  magicLinkUrl: string
): Promise<{ delivered: boolean; devUrl?: string }> {
  const enabled = process.env.PARENT_EMAIL_ENABLED === "true";
  if (!enabled) {
    console.warn(`[DEV_MAGIC_LINK] to=${email} url=${magicLinkUrl}`);
    return { delivered: false, devUrl: magicLinkUrl };
  }
  // TODO(PV-10/email-infra): send via Resend + React Email template.
  // For now, even when enabled we surface devUrl so nothing silently breaks.
  console.warn(
    `[MAGIC_LINK] email backend not yet implemented; email=${email} url=${magicLinkUrl}`
  );
  return { delivered: false, devUrl: magicLinkUrl };
}
