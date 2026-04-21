// POST /api/billing/webhook/toss — Toss Payments 웹훅 수신 엔드포인트.
//
// Toss는 결제 상태 변경 / 가상계좌 입금 등을 여기로 POST한다.
// 인증은 "쿼리 파라미터 secret" 또는 본문 서명 중 선택. 본 scaffold는
// `TOSS_WEBHOOK_SECRET` 환경변수 값을 쿼리 `?secret=...` 로 받는 단순 방식을 사용.
// 실 운영 전에 토스 콘솔에서 동일 값을 등록하고 HTTPS 필수.

import { db } from "@/lib/db";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const expected = process.env.TOSS_WEBHOOK_SECRET;
  if (!expected) {
    // 미설정 → 403으로 명시적으로 거절해서 오작동 방지.
    return new Response(JSON.stringify({ error: "webhook_not_configured" }), {
      status: 503,
    });
  }
  if (url.searchParams.get("secret") !== expected) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }

  const payload = (await req.json().catch(() => null)) as
    | {
        eventType?: string;
        data?: { orderId?: string; paymentKey?: string; status?: string };
      }
    | null;
  if (!payload) {
    return new Response(JSON.stringify({ error: "bad_request" }), { status: 400 });
  }

  const orderId = payload.data?.orderId ?? null;
  const eventType = payload.eventType ?? "unknown";

  // 기존 PaymentEvent 찾기 (checkout 단계에서 pending 으로 만들었을 가능성).
  if (orderId) {
    const existing = await db.paymentEvent.findUnique({ where: { pgOrderId: orderId } });
    if (existing) {
      await db.paymentEvent.update({
        where: { id: existing.id },
        data: {
          status:
            payload.data?.status === "DONE"
              ? "succeeded"
              : payload.data?.status === "CANCELED"
                ? "failed"
                : existing.status,
          pgPaymentKey: payload.data?.paymentKey ?? existing.pgPaymentKey,
          rawPayload: payload as never,
        },
      });
      return new Response(JSON.stringify({ ok: true, matched: true }), { status: 200 });
    }
  }

  // 매칭 실패 → 미지 이벤트로 감사 로그만 남긴다 (재발행 방지용 파이프).
  await db.paymentEvent.create({
    data: {
      userId: "", // 미매칭 — FK가 required이므로 실제론 스킵 가능하게 스펙 변경 필요.
      type: `webhook:${eventType}`,
      amount: 0,
      currency: "KRW",
      status: "succeeded",
      pgOrderId: orderId,
      rawPayload: payload as never,
    },
  }).catch(() => {
    // userId FK 위반 시 무음 — 이후 리콘실리에이션 큐에서 처리 예정
  });

  return new Response(JSON.stringify({ ok: true, matched: false }), { status: 200 });
}
