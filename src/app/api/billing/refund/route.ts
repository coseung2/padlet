// POST /api/billing/refund — 교사 본인 결제 건 환불(취소).
// 본인 구독 내 최근 PaymentEvent의 pgPaymentKey 로 Toss /v1/payments/:key/cancel 호출.
//
// Body:
//   { orderId?: string }  // 없으면 최신 succeeded charge 1건
//   { cancelReason: string, cancelAmount?: number }
//
// 전액 환불 성공 시 subscription을 free로 downgrade(즉시 취소).

import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { cancelPayment, TossConfigMissingError } from "@/lib/billing/toss";

const Schema = z.object({
  orderId: z.string().optional(),
  cancelReason: z.string().trim().min(1).max(200),
  cancelAmount: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "bad_request", detail: parsed.error.issues }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { orderId, cancelReason, cancelAmount } = parsed.data;

  // 대상 PaymentEvent 선택: orderId 지정 시 그것, 없으면 본인 계정의 최신 succeeded charge.
  const target = await db.paymentEvent.findFirst({
    where: {
      userId: user.id,
      type: "charge",
      status: "succeeded",
      pgPaymentKey: { not: null },
      ...(orderId ? { pgOrderId: orderId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (!target || !target.pgPaymentKey) {
    return new Response(JSON.stringify({ error: "no_refundable_payment" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  let result;
  try {
    result = await cancelPayment({
      paymentKey: target.pgPaymentKey,
      cancelReason,
      cancelAmount,
    });
  } catch (err) {
    if (err instanceof TossConfigMissingError) {
      return new Response(JSON.stringify({ error: "billing_not_configured" }), { status: 503 });
    }
    return new Response(
      JSON.stringify({ error: "cancel_failed", message: String((err as Error).message) }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  // 환불 이벤트 로그.
  await db.paymentEvent.create({
    data: {
      userId: user.id,
      subscriptionId: user.id,
      type: "refund",
      amount: result.canceledAmount,
      currency: "KRW",
      status: "succeeded",
      pgPaymentKey: target.pgPaymentKey,
      rawPayload: result.raw as never,
    },
  });

  // 전액 환불 시 구독 즉시 종료 — 부분 환불은 상태 유지.
  const isFullRefund = result.status === "CANCELED";
  if (isFullRefund) {
    await db.teacherSubscription.update({
      where: { userId: user.id },
      data: {
        status: "canceled",
        plan: "free",
        pgBillingKey: null,
        canceledAt: new Date(),
        currentPeriodEnd: new Date(),
      },
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      cancelStatus: result.status,
      canceledAmount: result.canceledAmount,
      balanceAmount: result.balanceAmount,
      downgradedToFree: isFullRefund,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
