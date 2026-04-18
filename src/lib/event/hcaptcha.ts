/**
 * hCaptcha verification (ES-11).
 *
 * Graceful degrade: when HCAPTCHA_SECRET is unset, verification is skipped
 * (returns { ok: true, skipped: true }). When the secret is set, token MUST
 * be present and validated against hcaptcha.com/siteverify.
 */
export async function verifyCaptcha(
  token: string | undefined
): Promise<{ ok: boolean; skipped: boolean; reason?: string }> {
  const secret = process.env.HCAPTCHA_SECRET;
  if (!secret) return { ok: true, skipped: true };
  if (!token) return { ok: false, skipped: false, reason: "missing_token" };

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);

  try {
    const res = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      // siteverify is quick; short timeout avoids hanging public routes.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, skipped: false, reason: "verify_http_" + res.status };
    const json = (await res.json()) as { success?: boolean };
    return { ok: Boolean(json.success), skipped: false, reason: json.success ? undefined : "failed" };
  } catch (e) {
    return { ok: false, skipped: false, reason: "network" };
  }
}

export function captchaEnabled(): boolean {
  return Boolean(process.env.HCAPTCHA_SECRET);
}
