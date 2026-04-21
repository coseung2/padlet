// GET /api/billing/status — 현재 로그인한 교사의 구독 상태 요약.
// 페이먼츠 UI + Free/Pro 게이팅 클라이언트 훅에서 사용.

import { getCurrentUser } from "@/lib/auth";
import { getSubscriptionSnapshot } from "@/lib/billing/subscription";
import { PLAN_CATALOG, getPublicClientKey } from "@/lib/billing/toss";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }
  const snap = await getSubscriptionSnapshot(user.id);
  return new Response(
    JSON.stringify({
      tier: snap.isPro ? "pro" : "free",
      plan: snap.plan,
      status: snap.status,
      currentPeriodEnd: snap.currentPeriodEnd,
      canceledAt: snap.canceledAt,
      cardLast4: snap.pgBillingKeyLast4,
      catalog: PLAN_CATALOG,
      // Client needs this to boot the Toss SDK; null = PG not configured on this deploy.
      tossClientKey: getPublicClientKey(),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
