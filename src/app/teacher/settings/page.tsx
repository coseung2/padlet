import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isCanvaConnected, getCanvaClientId } from "@/lib/canva";
import { getSubscriptionSnapshot } from "@/lib/billing/subscription";
import { LlmKeyForm } from "@/components/LlmKeyForm";
import { ConnectedAppsSection } from "@/components/teacher/ConnectedAppsSection";

export const metadata = {
  title: "교사 설정 · Aura-board",
};

// 교사 연동·구독 정보를 한 페이지에서 보고 관리. ⚙ 메뉴는 여기만 가리킨다.
// 각 섹션은 상세 도움말 docs 페이지로 deep-link 유지.

export default async function TeacherSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [canvaConnected, sub, connectedApps] = await Promise.all([
    isCanvaConnected(user.id),
    getSubscriptionSnapshot(user.id),
    loadConnectedApps(user.id),
  ]);
  const canvaConfigured = !!getCanvaClientId();

  return (
    <main className="docs-page">
      <article className="docs-article">
        <Link href="/" className="docs-back">← 대시보드로</Link>
        <h1 className="docs-title">교사 설정</h1>
        <p className="docs-subtitle">
          생성형 AI·Canva·결제 연동 상태를 한곳에서 확인·관리합니다.
        </p>

        <section id="llm" className="docs-section settings-section">
          <div className="settings-section-header">
            <h2 className="docs-h2">🤖 생성형 AI 연결</h2>
            <Link href="/docs/ai-setup" className="docs-link settings-help-link">
              발급 방법 안내 →
            </Link>
          </div>
          <p className="docs-p">
            교사가 보유한 Claude/ChatGPT/Gemini API Key를 등록하면{" "}
            <strong>코딩 교실</strong>의 바이브 코딩 보드에서 학생들이 이 Key로
            AI와 대화해 게임·퀴즈를 만듭니다. 보드 생성 시 별도 연결 과정은
            없고, 여기서 한 번 저장하면 해당 교사의 모든 코딩 교실 보드에
            적용됩니다.
          </p>
          <LlmKeyForm />
        </section>

        <section id="canva" className="docs-section settings-section">
          <div className="settings-section-header">
            <h2 className="docs-h2">🎨 Canva 연동</h2>
            <Link href="/docs/canva-setup" className="docs-link settings-help-link">
              Canva 앱 설치 안내 →
            </Link>
          </div>
          <CanvaStatusBlock connected={canvaConnected} configured={canvaConfigured} />
        </section>

        <section id="external-apps" className="docs-section settings-section">
          <div className="settings-section-header">
            <h2 className="docs-h2">🔗 연결된 외부 앱</h2>
          </div>
          <p className="docs-p">
            외부 교사 도구(예: Aura)가 OAuth 로 회원님의 학급 평어·채점 결과를
            읽도록 허용한 목록입니다. 연결을 해제하면 해당 앱은 다음 호출부터
            401 을 받고 재인증해야 합니다.
          </p>
          <ConnectedAppsSection apps={connectedApps} />
        </section>

        <section id="billing" className="docs-section settings-section">
          <div className="settings-section-header">
            <h2 className="docs-h2">💳 결제·구독</h2>
            <Link href="/billing" className="docs-link settings-help-link">
              결제 페이지 열기 →
            </Link>
          </div>
          <SubscriptionSummary
            plan={sub.plan}
            status={sub.status}
            isPro={sub.isPro}
            currentPeriodEnd={sub.currentPeriodEnd}
            canceledAt={sub.canceledAt}
            cardLast4={sub.pgBillingKeyLast4}
          />
        </section>
      </article>
    </main>
  );
}

async function loadConnectedApps(teacherId: string) {
  // 활성(미revoke + 미만료) access token 그룹핑. 한 교사 × 한 client = 한 row.
  // tokenPair 한 쌍씩 발급되니 access 만 골라도 충분.
  const tokens = await db.oAuthAccessToken.findMany({
    where: {
      userId: teacherId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      clientId: true,
      scope: true,
      createdAt: true,
      lastUsedAt: true,
      client: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  // 같은 client 가 여러 활성 토큰을 가질 수 있으니 가장 최근 1건만.
  const seen = new Set<string>();
  const apps: {
    clientId: string;
    clientName: string;
    scope: string;
    connectedAt: string;
    lastUsedAt: string | null;
  }[] = [];
  for (const t of tokens) {
    if (seen.has(t.clientId)) continue;
    seen.add(t.clientId);
    apps.push({
      clientId: t.clientId,
      clientName: t.client.name,
      scope: t.scope,
      connectedAt: t.createdAt.toISOString(),
      lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
    });
  }
  return apps;
}

function CanvaStatusBlock({
  connected,
  configured,
}: {
  connected: boolean;
  configured: boolean;
}) {
  if (!configured) {
    return (
      <div className="settings-status-row is-warn">
        <span className="settings-status-dot">▲</span>
        <span className="settings-status-text">
          서버에 Canva Client ID가 설정되지 않음 — 관리자 환경 변수 확인 필요
        </span>
      </div>
    );
  }
  if (connected) {
    return (
      <div className="settings-status-row is-ok">
        <div className="settings-status-line">
          <span className="settings-status-dot">●</span>
          <span className="settings-status-text">Canva 계정이 연결됨</span>
        </div>
        <a href="/api/auth/canva" className="settings-action-btn">다시 인증</a>
      </div>
    );
  }
  return (
    <div className="settings-status-row is-idle">
      <div className="settings-status-line">
        <span className="settings-status-dot">○</span>
        <span className="settings-status-text">아직 연결되지 않음</span>
      </div>
      <a href="/api/auth/canva" className="settings-action-btn is-primary">
        Canva 계정 연결
      </a>
    </div>
  );
}

function SubscriptionSummary({
  plan,
  status,
  isPro,
  currentPeriodEnd,
  canceledAt,
  cardLast4,
}: {
  plan: string;
  status: string;
  isPro: boolean;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
  cardLast4: string | null;
}) {
  return (
    <div className="settings-billing-summary">
      <div className="settings-billing-line">
        <span className={`settings-pill ${isPro ? "is-pro" : "is-free"}`}>
          {isPro ? "Pro" : "Free"}
        </span>
        <span className="settings-billing-meta">
          플랜 <strong>{plan}</strong> · 상태 <strong>{status}</strong>
        </span>
      </div>
      {currentPeriodEnd && (
        <div className="settings-billing-line settings-billing-muted">
          다음 결제일 {new Date(currentPeriodEnd).toLocaleDateString("ko-KR")}
          {canceledAt && <span> (취소 예약됨)</span>}
        </div>
      )}
      {cardLast4 && (
        <div className="settings-billing-line settings-billing-muted">
          카드 끝자리 ...{cardLast4}
        </div>
      )}
      {!isPro && (
        <Link href="/billing" className="settings-action-btn is-primary">
          Pro 업그레이드
        </Link>
      )}
    </div>
  );
}
