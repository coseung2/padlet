/**
 * POST /api/external/link-start
 *
 * 첫 번째 단계: Canva 앱이 `oauth.requestAuthorization` 을 호출하기 전에
 * 이 엔드포인트로 `Authorization: Bearer <Canva JWT>` 를 보낸다. 백엔드
 * 가 Canva JWT 를 검증한 뒤 canvaUserId 를 담은 짧은 HMAC 토큰(nonce)
 * 을 돌려주고, 앱은 이를 `requestAuthorization` 의 queryParams.link_nonce
 * 에 실어 Canva 가 `/oauth/authorize` 로 forwarding 할 때 함께 전달되게
 * 한다. 긴 JWT 를 queryParams 로 그대로 전달하면 Canva SDK 가 drop 하는
 * 문제가 있어 짧은 nonce 방식으로 우회.
 */
import { NextResponse } from "next/server";
import { verifyCanvaToken, looksLikeCanvaJwt } from "@/lib/canva-jwt";
import { signLinkNonce } from "@/lib/canva-link-nonce";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  console.log("[external/link-start] hit", {
    authHead: authHeader.slice(0, 30),
    authLen: authHeader.length,
    origin: req.headers.get("origin"),
    referer: req.headers.get("referer"),
  });
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: { code: "missing_bearer" } },
      { status: 401 },
    );
  }
  const token = authHeader.slice(7).trim();
  if (!looksLikeCanvaJwt(token)) {
    // Dump the first few chars + length so we can tell whether the app
    // actually sent a JWT vs. some other token shape.
    console.warn("[external/link-start] shape fail", {
      head: token.slice(0, 20),
      len: token.length,
      dots: token.split(".").length - 1,
    });
    return NextResponse.json(
      { error: { code: "not_a_canva_jwt" } },
      { status: 401 },
    );
  }
  // Decode the JWT header + payload WITHOUT verifying so we can see
  // issuer/audience and line them up with verifyCanvaToken's expectations.
  try {
    const [h, p] = token.split(".");
    const header = JSON.parse(Buffer.from(h!, "base64url").toString());
    const payload = JSON.parse(Buffer.from(p!, "base64url").toString());
    console.log("[external/link-start] jwt meta", {
      header: { alg: header.alg, kid: header.kid },
      iss: payload.iss,
      aud: payload.aud,
      sub: payload.sub
        ? `${String(payload.sub).slice(0, 8)}…`
        : null,
      exp: payload.exp,
      now: Math.floor(Date.now() / 1000),
    });
  } catch (e) {
    console.warn("[external/link-start] jwt pre-decode failed", e);
  }
  try {
    const claims = await verifyCanvaToken(token);
    const nonce = signLinkNonce(claims.canvaUserId);
    return NextResponse.json({ linkNonce: nonce });
  } catch (e) {
    console.error("[external/link-start] jwt verify failed", e);
    return NextResponse.json(
      { error: { code: "invalid_canva_jwt" } },
      { status: 401 },
    );
  }
}
