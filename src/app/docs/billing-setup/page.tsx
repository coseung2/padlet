import Link from "next/link";

export const metadata = {
  title: "결제 연동 안내 · Aura-board",
};

// 관리자(서비스 운영자)용 문서. Toss Payments 연동에 필요한 환경 변수와
// 웹훅 설정 방법을 정리. 교사 사용자용이 아니며 /billing 페이지에서만 링크.

export default function BillingSetupPage() {
  return (
    <main className="docs-page">
      <article className="docs-article">
        <Link href="/billing" className="docs-back">← 결제 페이지로</Link>
        <h1 className="docs-title">결제 연동 안내 (관리자용)</h1>
        <p className="docs-subtitle">
          Aura-board Pro 구독은 Toss Payments 빌링키 방식으로 운영됩니다. 아래 순서로
          Vercel 환경 변수와 Toss 콘솔을 설정하면 /billing 페이지의 결제 버튼이
          즉시 활성화됩니다.
        </p>

        <section className="docs-section">
          <h2 className="docs-h2">1. Toss 콘솔에서 키 발급</h2>
          <ol className="docs-list">
            <li>
              <a href="https://app.tosspayments.com" target="_blank" rel="noopener noreferrer" className="docs-link">
                app.tosspayments.com
              </a>{" "}
              접속 → 상점 생성 → 결제수단에서 <strong>빌링(정기결제)</strong> 활성화.
            </li>
            <li>개발자 센터 → API 키에서 <code className="docs-code">클라이언트 키</code>(test/live)와 <code className="docs-code">시크릿 키</code>를 각각 복사.</li>
            <li>웹훅 설정에서 <code className="docs-code">https://&lt;도메인&gt;/api/billing/webhook/toss?secret=&lt;임의값&gt;</code>를 등록.</li>
          </ol>
        </section>

        <section className="docs-section">
          <h2 className="docs-h2">2. Vercel 환경 변수</h2>
          <p className="docs-p">다음 3개를 Production + Preview 모두에 설정:</p>
          <ul className="docs-list">
            <li><code className="docs-code">TOSS_CLIENT_KEY</code> — 클라이언트 공개 키 (ck_...)</li>
            <li><code className="docs-code">TOSS_SECRET_KEY</code> — 시크릿 키 (sk_...) · 절대 client bundle에 노출 금지</li>
            <li><code className="docs-code">TOSS_WEBHOOK_SECRET</code> — 위 웹훅 URL에 쿼리로 넣은 임의값과 일치</li>
          </ul>
          <p className="docs-p docs-note">
            테스트 결제를 먼저 돌려본 뒤 실키(live)로 교체하세요. 테스트키로는 실제
            청구가 발생하지 않지만 동일 API 경로로 동작합니다.
          </p>
        </section>

        <section className="docs-section">
          <h2 className="docs-h2">3. 결제 흐름</h2>
          <ol className="docs-list">
            <li>교사가 /billing → <strong>Pro 월/연 구독</strong> 버튼 클릭</li>
            <li>/api/billing/checkout이 customerKey + orderId 발급 후 Toss SDK 호출</li>
            <li>Toss 결제창 카드 등록 → /billing/callback으로 리다이렉트</li>
            <li>/api/billing/confirm이 authKey → 빌링키 발급 + 첫 결제 실행</li>
            <li>이후 매 결제 주기 만료 시 cron이 chargeBillingKey 재호출 (후속 작업)</li>
          </ol>
        </section>

        <section className="docs-section">
          <h2 className="docs-h2">4. 보안 체크리스트</h2>
          <ul className="docs-list">
            <li>시크릿 키는 서버 전용. <code className="docs-code">src/lib/billing/toss.ts</code>에서만 import되며 client에 번들되지 않음.</li>
            <li>빌링키(<code className="docs-code">pgBillingKey</code>) 자체는 현재 평문으로 DB에 저장됩니다. 프로덕션 오픈 전 <code className="docs-code">LLM_KEY_SECRET</code>과 동일한 AES-GCM으로 암호화하세요.</li>
            <li>웹훅 엔드포인트는 <code className="docs-code">?secret=</code> 쿼리로 간이 인증. 실 운영은 HMAC 서명 검증으로 교체 권장.</li>
            <li>환불·부분취소 API는 현재 scaffold에 미포함. Toss /v1/payments/cancel로 확장할 것.</li>
          </ul>
        </section>
      </article>
    </main>
  );
}
