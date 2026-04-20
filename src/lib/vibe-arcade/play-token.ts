// Vibe-arcade play token (Seed 13, AC-F11 / AC-G1).
// HMAC-signed short-lived token (1h) — same primitive pattern as student-auth.
// The sandbox route verifies the token before returning HTML.

import { createHmac, timingSafeEqual } from "crypto";

const SECRET = () => {
  const s = process.env.PLAYTOKEN_JWT_SECRET;
  if (!s) {
    throw new Error("PLAYTOKEN_JWT_SECRET is not set");
  }
  return s;
};

const TTL_MS = 60 * 60 * 1000; // 1 hour

type TokenPayload = {
  pid: string; // projectId
  psi: string; // playSessionId
  exp: number; // ms epoch
};

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payloadB64: string): string {
  return createHmac("sha256", SECRET()).update(payloadB64).digest("base64url");
}

export function issuePlayToken(projectId: string, playSessionId: string): string {
  const payload: TokenPayload = {
    pid: projectId,
    psi: playSessionId,
    exp: Date.now() + TTL_MS,
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifyPlayToken(token: string):
  | { ok: true; projectId: string; playSessionId: string }
  | { ok: false; reason: "malformed" | "bad_sig" | "expired" } {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [payloadB64, sig] = parts;
  const expected = sign(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_sig" };
  }
  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, projectId: payload.pid, playSessionId: payload.psi };
}
