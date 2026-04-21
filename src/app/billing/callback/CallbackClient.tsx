"use client";

// /billing/callback — Toss가 successUrl로 보낸 authKey + customerKey + planKey + orderId를
// 서버의 /api/billing/confirm에 POST해 빌링키 발급 + 첫 결제를 실행.

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Phase = "confirming" | "success" | "failed";

export function CallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [phase, setPhase] = useState<Phase>("confirming");
  const [message, setMessage] = useState<string>("결제를 확인하고 있어요…");
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const authKey = params.get("authKey");
    const customerKey = params.get("customerKey");
    const planKey = params.get("planKey") as "pro_monthly" | "pro_yearly" | null;
    const orderId = params.get("orderId");

    if (!authKey || !customerKey || !planKey || !orderId) {
      setPhase("failed");
      setMessage("필수 파라미터가 누락되었습니다. 처음부터 다시 시도해 주세요.");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/billing/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authKey, customerKey, planKey, orderId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setPhase("failed");
          setMessage(data.message ?? data.error ?? `실패 (HTTP ${res.status})`);
          return;
        }
        setPhase("success");
        setMessage(
          `Pro 구독이 활성화되었습니다. 다음 결제일: ${
            data.currentPeriodEnd
              ? new Date(data.currentPeriodEnd).toLocaleDateString("ko-KR")
              : "-"
          }`,
        );
        setTimeout(() => router.replace("/billing"), 1500);
      } catch (err) {
        setPhase("failed");
        setMessage(`오류: ${(err as Error).message}`);
      }
    })();
  }, [params, router]);

  return (
    <div className={`billing-callback billing-callback-${phase}`}>
      <p>{message}</p>
    </div>
  );
}
