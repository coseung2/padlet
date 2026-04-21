// POST /api/billing/cancel — 구독 취소 예약.
// 현재 기간 끝까지 Pro 유지, currentPeriodEnd 시점에 cron이 status=canceled 처리.

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const sub = await db.teacherSubscription.findUnique({ where: { userId: user.id } });
  if (!sub) {
    return new Response(JSON.stringify({ error: "no_subscription" }), { status: 404 });
  }
  if (sub.canceledAt) {
    return new Response(
      JSON.stringify({ ok: true, alreadyCanceled: true, canceledAt: sub.canceledAt }),
      { status: 200 },
    );
  }

  const now = new Date();
  await db.teacherSubscription.update({
    where: { userId: user.id },
    data: { canceledAt: now },
  });

  await db.paymentEvent.create({
    data: {
      userId: user.id,
      subscriptionId: user.id,
      type: "cancel",
      amount: 0,
      currency: "KRW",
      status: "succeeded",
    },
  });

  return new Response(
    JSON.stringify({ ok: true, canceledAt: now, currentPeriodEnd: sub.currentPeriodEnd }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
