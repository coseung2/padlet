import Link from "next/link";
import { CallbackClient } from "./CallbackClient";

export const metadata = {
  title: "결제 확인 · Aura-board",
};

export default function BillingCallbackPage() {
  return (
    <main className="docs-page">
      <article className="docs-article">
        <Link href="/billing" className="docs-back">← 결제 페이지로</Link>
        <h1 className="docs-title">결제 확인</h1>
        <CallbackClient />
      </article>
    </main>
  );
}
