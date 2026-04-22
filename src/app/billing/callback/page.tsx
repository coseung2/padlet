import { Suspense } from "react";
import Link from "next/link";
import { CallbackClient } from "./CallbackClient";

export const metadata = {
  title: "결제 확인 · Aura-board",
};

// useSearchParams()는 prerender 시 Suspense boundary 필요 — 없으면 static
// 생성이 CSR bailout 로 실패 (next build 에러). fallback 은 confirming 상태와
// 동일한 문구로 깜빡임 최소화.
export default function BillingCallbackPage() {
  return (
    <main className="docs-page">
      <article className="docs-article">
        <Link href="/billing" className="docs-back">← 결제 페이지로</Link>
        <h1 className="docs-title">결제 확인</h1>
        <Suspense
          fallback={
            <div className="billing-callback billing-callback-confirming">
              <p>결제를 확인하고 있어요…</p>
            </div>
          }
        >
          <CallbackClient />
        </Suspense>
      </article>
    </main>
  );
}
