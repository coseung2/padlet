/**
 * POST /api/oauth/consent — handles the consent-screen form submission.
 *
 * On `allow` we issue a short-lived authorization code and 302-redirect to
 * the Canva-registered redirect_uri (with ?code + &state). On `deny` we
 * redirect to the same URI with ?error=access_denied, per RFC 6749 §4.1.2.1.
 *
 * The incoming POST is a form submit from /oauth/authorize — not a public
 * API — so the student's cookie session attests identity. We re-validate
 * client_id / redirect_uri defensively in case the hidden fields were
 * tampered with client-side.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentStudent } from "@/lib/student-auth";
import { issueAuthCode } from "@/lib/oauth-server";
import { verifyCanvaToken, looksLikeCanvaJwt } from "@/lib/canva-jwt";

export const runtime = "nodejs";
export const maxDuration = 10;

function safeRedirect(uri: string, params: Record<string, string>) {
  const u = new URL(uri);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return NextResponse.redirect(u.toString(), 302);
}

export async function POST(req: Request) {
  const form = await req.formData();
  const clientId = String(form.get("client_id") ?? "");
  const redirectUri = String(form.get("redirect_uri") ?? "");
  const scope = String(form.get("scope") ?? "");
  const state = String(form.get("state") ?? "");
  const codeChallenge = String(form.get("code_challenge") ?? "");
  const codeChallengeMethod = String(form.get("code_challenge_method") ?? "S256");
  const decision = String(form.get("decision") ?? "");

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // Revalidate client + redirect_uri.
  const client = await db.oAuthClient.findUnique({ where: { id: clientId } });
  if (!client) {
    return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  }
  const redirects = JSON.parse(client.redirectUris) as string[];
  if (!redirects.includes(redirectUri)) {
    return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
  }
  if (client.pkceRequired && (!codeChallenge || codeChallengeMethod !== "S256")) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // Student must still be logged in at the moment the form is submitted.
  const student = await getCurrentStudent();
  if (!student) {
    return NextResponse.json({ error: "student_session_required" }, { status: 401 });
  }

  if (decision === "deny") {
    return safeRedirect(redirectUri, {
      error: "access_denied",
      ...(state ? { state } : {}),
    });
  }

  if (decision !== "allow") {
    return NextResponse.json({ error: "invalid_decision" }, { status: 400 });
  }

  // If the Canva app forwarded a getCanvaUserToken() JWT through the
  // authorize flow, bind the resulting Canva user id to this student now.
  // Subsequent /api/external/* calls from the Canva app can then pass the
  // JWT as Bearer and be resolved to this student without any cookie.
  const canvaToken = String(form.get("canva_token") ?? "").trim();
  console.log("[oauth/consent]", {
    studentId: student.id,
    clientId,
    hasCanvaToken: Boolean(canvaToken),
    canvaTokenLen: canvaToken.length,
    allFormKeys: Array.from(form.keys()),
  });
  if (canvaToken && looksLikeCanvaJwt(canvaToken)) {
    try {
      const claims = await verifyCanvaToken(canvaToken);
      console.log("[oauth/consent] linking canvaUserId:", claims.canvaUserId);
      await db.canvaAppLink.upsert({
        where: { canvaUserId: claims.canvaUserId },
        create: {
          canvaUserId: claims.canvaUserId,
          studentId: student.id,
          scope,
        },
        update: { studentId: student.id, scope },
      });
    } catch (e) {
      // Non-fatal — still issue the auth code; app can retry the link flow.
      console.warn("[oauth/consent] Canva JWT link skipped:", e);
    }
  } else if (canvaToken) {
    console.warn(
      "[oauth/consent] canva_token present but shape invalid",
      canvaToken.slice(0, 32),
    );
  }

  const code = await issueAuthCode({
    studentId: student.id,
    clientId,
    redirectUri,
    scope,
    codeChallenge,
    codeChallengeMethod,
    state: state || null,
  });

  return safeRedirect(redirectUri, {
    code,
    ...(state ? { state } : {}),
  });
}
