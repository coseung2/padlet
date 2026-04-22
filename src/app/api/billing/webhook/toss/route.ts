// POST /api/billing/webhook/toss — Toss Payments 웹훅 수신.
//
// 2단계 인증:
//   1) 쿼리 파라미터 `?secret=<TOSS_WEBHOOK_SECRET>` (타이밍-안전 비교)
//   2) (선택) Toss가 HMAC 서명 헤더를 보내주면 본문 검증 — Toss 콘솔에서
//      "웹훅 서명 검증" 활성화했을 때만 사용. `TOSS_WEBHOOK_SIGNING_SECRET`
//      환경변수가 있으면 검증, 없으면 쿼리 secret만.
//
// 매칭 로직:
//   - payload.data.orderId로 기존 PaymentEvent 조회 → 상태/paymentKey 동기화
//   - 미매칭 이벤트는 userId="" 로 감사 로그만 남기려 했으나 FK required라
//     실제로는 스킵. Slack/Sentry에 경고만 노출(SEC-2 구현 시 연결).

import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

function verifyQuerySecret(req: Request): boolean {
  const expected = process.env.TOSS_WEBHOOK_SECRET;
  if (!expected) return false;
  const given = new URL(req.url).searchParams.get("secret") ?? "";
  return timingSafeEqualStrings(given, expected);
}

/**
 * HMAC-SHA256 기반 선택적 서명 검증.
 * Toss 콘솔에서 webhook 서명 활성 시 req 헤더 `TossPayments-Signature` 에
 * base64 HMAC(body, signingSecret) 이 담겨 온다. 콘솔 미활성 / secret 미설정
 * 이면 true(skip).
 */
function verifyHmacSignature(req: Request, rawBody: string): boolean {
  const signingSecret = process.env.TOSS_WEBHOOK_SIGNING_SECRET;
  if (!signingSecret) return true; // 검증 미설정 — 스킵
  const header = req.headers.get("tosspayments-signature") ?? "";
  if (!header) return false; // 검증 활성인데 헤더 없음 → 거절
  const expected = createHmac("sha256", signingSecret).update(rawBody).digest("base64");
  return timingSafeEqualStrings(header, expected);
}

export async function POST(req: Request) {
  if (!process.env.TOSS_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "webhook_not_configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!verifyQuerySecret(req)) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  if (!verifyHmacSignature(req, rawBody)) {
    return new Response(JSON.stringify({ error: "signature_invalid" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: {
    eventType?: string;
    data?: { orderId?: string; paymentKey?: string; status?: string };
  } | null = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "bad_request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!payload) {
    return new Response(JSON.stringify({ error: "bad_request" }), { status: 400 });
  }

  const orderId = payload.data?.orderId ?? null;

  if (orderId) {
    const existing = await db.paymentEvent.findUnique({ where: { pgOrderId: orderId } });
    if (existing) {
      const nextStatus =
        payload.data?.status === "DONE"
          ? "succeeded"
          : payload.data?.status === "CANCELED" || payload.data?.status === "FAILED"
            ? "failed"
            : existing.status;
      await db.paymentEvent.update({
        where: { id: existing.id },
        data: {
          status: nextStatus,
          pgPaymentKey: payload.data?.paymentKey ?? existing.pgPaymentKey,
          rawPayload: payload as never,
        },
      });
      return new Response(JSON.stringify({ ok: true, matched: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // 매칭 실패 — 미지 이벤트. FK required로 추가 로그 저장은 못 함.
  // SEC-2 Slack 알림 연결 후 여기서 notify 호출 예정.
  return new Response(
    JSON.stringify({ ok: true, matched: false, orderId }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
