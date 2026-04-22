"use client";

// VibePlayModal — 승인된 프로젝트를 sandboxed iframe으로 재생 (2026-04-21, Phase 4).
// 1. POST /api/vibe/play-sessions → playToken (HMAC) 발급
// 2. iframe src = /sandbox/vibe/:projectId?pt=... (cross-origin CSP + allow-scripts only)
// 3. postMessage `{type:"completed"|"report"}` 수신 — 현재는 수신 확인만, 분석 이벤트는 후속.

import { useEffect, useState } from "react";

type Props = {
  projectId: string;
  title: string;
  onClose: () => void;
};

export function VibePlayModal({ projectId, title, onClose }: Props) {
  const [playToken, setPlayToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/vibe/play-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `play ${res.status}`);
        }
        const data = (await res.json()) as { playToken: string };
        if (!cancelled) setPlayToken(data.playToken);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    // SEC-3 postMessage origin 검증:
    // sandbox iframe은 현재 같은 origin(/sandbox/vibe/:id)이지만, 향후
    // sandbox.aura-board.app 서브도메인으로 분리될 예정. 그 시점에는 env로
    // 허용 origin을 확장한다. 지금은 자기 자신(self origin) + null(Workers
    // 샌드박스 예외) + NEXT_PUBLIC_VIBE_SANDBOX_ORIGIN(옵션) 만 신뢰.
    const allowedOrigins = new Set<string>(
      [
        typeof window !== "undefined" ? window.location.origin : "",
        process.env.NEXT_PUBLIC_VIBE_SANDBOX_ORIGIN ?? "",
      ].filter(Boolean),
    );

    function onMessage(e: MessageEvent) {
      // e.origin 이 허용 목록 밖이면 조용히 drop — 다른 탭·iframe의 스푸핑 차단.
      if (!allowedOrigins.has(e.origin)) return;
      if (!e.data || typeof e.data !== "object") return;
      const type = (e.data as { type?: string }).type;
      if (type === "completed" || type === "report") {
        // Phase 4: 수신 확인만. 완료/리포트 분석 이벤트는 별도 follow-up.
        // 의도적으로 no-op — 향후 analytics 훅.
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="vs-backdrop vp-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="vp-modal">
        <header className="vp-head">
          <h2 className="vp-title">{title}</h2>
          <button
            type="button"
            className="vs-studio-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </header>
        <div className="vp-body">
          {error ? (
            <div className="vp-err" role="alert">
              플레이 불가: {error === "unauthorized" ? "학생으로 로그인해 주세요." : error}
            </div>
          ) : !playToken ? (
            <div className="vp-loading">불러오는 중…</div>
          ) : (
            <iframe
              className="vp-iframe"
              title={title}
              src={`/sandbox/vibe/${projectId}?pt=${encodeURIComponent(playToken)}`}
              sandbox="allow-scripts"
            />
          )}
        </div>
      </div>
    </div>
  );
}
