// POST /api/billing/confirm — /billing/callback 페이지에서 호출.
// authKey + customerKey + planKey + orderId를 받아:
//   1) issueBillingKey 로 빌링키 발급
//   2) chargeBillingKey 로 첫 결제 실행
//   3) TeacherSubscription 업데이트 (plan=pro_*, currentPeriodStart/End, billingKey 저장)
//   4) PaymentEvent 업데이트 (succeeded/failed)

import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  PLAN_CATALOG,
  chargeBillingKey,
  issueBillingKey,
  TossConfigMissingError,
} from "@/lib/billing/toss";
import { encryptBillingKey } from "@/lib/billing/billing-key-crypto";

const Schema = z.object({
  authKey: z.string().min(1),
  customerKey: z.string().min(1),
  orderId: z.string().min(1),
  planKey: z.enum(["pro_monthly", "pro_yearly"]),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "bad_request" }), { status: 400 });
  }
  const { authKey, customerKey, orderId, planKey } = parsed.data;
  const plan = PLAN_CATALOG[planKey];

  // customerKey가 DB의 본인 레코드와 맞는지 확인 — 타인 결제 탈취 방지.
  const sub = await db.teacherSubscription.findUnique({ where: { userId: user.id } });
  if (!sub || sub.pgCustomerKey !== customerKey) {
    return new Response(JSON.stringify({ error: "customer_mismatch" }), { status: 403 });
  }

  // 1) 빌링키 발급
  let billing;
  try {
    billing = await issueBillingKey({ authKey, customerKey });
  } catch (err) {
    if (err instanceof TossConfigMissingError) {
      return new Response(JSON.stringify({ error: "billing_not_configured" }), { status: 503 });
    }
    await db.paymentEvent.updateMany({
      where: { pgOrderId: orderId },
      data: { status: "failed", errorMessage: String((err as Error).message) },
    });
    return new Response(
      JSON.stringify({ error: "issue_failed", message: String((err as Error).message) }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  // 2) 첫 결제
  let charge;
  try {
    charge = await chargeBillingKey({
      billingKey: billing.billingKey,
      customerKey,
      amount: plan.amount,
      orderId,
      orderName: plan.label,
      customerEmail: user.email,
      customerName: user.name,
    });
  } catch (err) {
    await db.paymentEvent.updateMany({
      where: { pgOrderId: orderId },
      data: { status: "failed", errorMessage: String((err as Error).message) },
    });
    return new Response(
      JSON.stringify({ error: "charge_failed", message: String((err as Error).message) }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  // 3) 구독 활성화
  const now = new Date();
  const end = new Date(now.getTime() + plan.periodDays * 24 * 60 * 60 * 1000);
  await db.teacherSubscription.update({
    where: { userId: user.id },
    data: {
      plan: plan.planKey,
      status: "active",
      pgBillingKey: encryptBillingKey(billing.billingKey),
      pgBillingKeyLast4: (billing.cardNumber ?? "").replace(/[^0-9]/g, "").slice(-4) || null,
      amount: plan.amount,
      currency: "KRW",
      currentPeriodStart: now,
      currentPeriodEnd: end,
      canceledAt: null,
    },
  });

  // 4) 이벤트 로그 갱신
  await db.paymentEvent.updateMany({
    where: { pgOrderId: orderId },
    data: {
      status: "succeeded",
      pgPaymentKey: charge.paymentKey,
      rawPayload: charge.raw as never,
    },
  });

  return new Response(
    JSON.stringify({
      ok: true,
      plan: plan.planKey,
      currentPeriodEnd: end,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
