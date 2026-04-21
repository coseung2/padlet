// Subscription 상태 조회·요약 헬퍼 (Seed 14, 2026-04-22).
// tier.ts에서 DB 기반 Pro 여부를 판정할 때 사용.

import "server-only";
import { db } from "../db";

export type SubscriptionSnapshot = {
  plan: "free" | "pro_monthly" | "pro_yearly";
  status: "active" | "trial" | "past_due" | "canceled" | "paused";
  isPro: boolean;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  pgBillingKeyLast4: string | null;
};

export async function getSubscriptionSnapshot(
  userId: string,
): Promise<SubscriptionSnapshot> {
  const row = await db.teacherSubscription.findUnique({ where: { userId } });
  if (!row) {
    return {
      plan: "free",
      status: "active",
      isPro: false,
      currentPeriodEnd: null,
      canceledAt: null,
      pgBillingKeyLast4: null,
    };
  }
  const now = new Date();
  // canceledAt이 설정됐더라도 currentPeriodEnd 전까지는 Pro 유지.
  const isProActive =
    (row.status === "active" || row.status === "trial") &&
    row.plan !== "free" &&
    (!row.currentPeriodEnd || row.currentPeriodEnd > now);

  return {
    plan: (row.plan as SubscriptionSnapshot["plan"]) ?? "free",
    status: (row.status as SubscriptionSnapshot["status"]) ?? "active",
    isPro: isProActive,
    currentPeriodEnd: row.currentPeriodEnd,
    canceledAt: row.canceledAt,
    pgBillingKeyLast4: row.pgBillingKeyLast4,
  };
}
