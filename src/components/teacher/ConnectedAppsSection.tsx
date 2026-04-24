"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ConnectedApp = {
  clientId: string;
  clientName: string;
  scope: string;
  connectedAt: string;
  lastUsedAt: string | null;
};

type Props = {
  apps: ConnectedApp[];
};

const SCOPE_LABEL: Record<string, string> = {
  "external:read": "학급 평어·채점 결과 읽기 (읽기 전용)",
};

export function ConnectedAppsSection({ apps }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDisconnect(clientId: string, clientName: string) {
    if (!window.confirm(`${clientName} 연결을 해제할까요? 다음 호출부터 Aura 에서 다시 인증해야 합니다.`)) {
      return;
    }
    setBusy(clientId);
    setError(null);
    try {
      const res = await fetch(
        `/api/teacher/oauth-clients/${encodeURIComponent(clientId)}/disconnect`,
        { method: "POST" }
      );
      if (!res.ok) {
        setError("연결 해제 실패");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (apps.length === 0) {
    return (
      <div className="settings-status-row is-idle">
        <div className="settings-status-line">
          <span className="settings-status-dot">○</span>
          <span className="settings-status-text">연결된 외부 앱이 없습니다</span>
        </div>
      </div>
    );
  }

  return (
    <div className="connected-apps-list">
      {apps.map((a) => (
        <div key={a.clientId} className="connected-app-row">
          <div className="connected-app-main">
            <div className="connected-app-name">
              <span className="settings-status-dot is-on">●</span> {a.clientName}
            </div>
            <div className="connected-app-meta">
              {SCOPE_LABEL[a.scope] ?? a.scope}
            </div>
            <div className="connected-app-meta connected-app-meta-faint">
              연결 {new Date(a.connectedAt).toLocaleString("ko-KR")}
              {a.lastUsedAt && (
                <> · 마지막 사용 {new Date(a.lastUsedAt).toLocaleString("ko-KR")}</>
              )}
            </div>
          </div>
          <button
            type="button"
            className="settings-action-btn"
            onClick={() => handleDisconnect(a.clientId, a.clientName)}
            disabled={busy !== null}
          >
            {busy === a.clientId ? "해제 중…" : "연결 해제"}
          </button>
        </div>
      ))}
      {error && <p className="connected-apps-error">{error}</p>}
    </div>
  );
}
