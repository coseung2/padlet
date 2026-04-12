"use client";

import { useEffect, useState } from "react";

type Props = {
  boardId: string;
  sectionId: string;
  initialToken: string | null;
};

function buildSharePath(boardId: string, sectionId: string, token: string) {
  return `/board/${boardId}/s/${sectionId}?token=${encodeURIComponent(token)}`;
}

export function SectionShareClient({ boardId, sectionId, initialToken }: Props) {
  const [token, setToken] = useState<string | null>(initialToken);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  // `origin` stays empty during SSR and first hydration so the server-rendered
  // HTML matches the initial client render (no hydration mismatch). We fill it
  // in after mount.
  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const sharePath = token ? buildSharePath(boardId, sectionId, token) : "";
  const absolute = sharePath ? (origin ? `${origin}${sharePath}` : sharePath) : "";

  async function handleGenerateOrRotate(confirmMessage: string | null) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch(`/api/sections/${sectionId}/share`, { method: "POST" });
      if (!res.ok) {
        setStatus("생성 실패");
        return;
      }
      const data = await res.json();
      setToken(data.section?.accessToken ?? null);
      setStatus("새 링크가 생성되었습니다");
    } catch {
      setStatus("생성 실패");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!absolute) return;
    try {
      await navigator.clipboard.writeText(absolute);
      setStatus("복사됨 ✓");
      window.setTimeout(() => setStatus(""), 1500);
    } catch {
      setStatus("복사 실패 — 수동으로 복사해 주세요");
    }
  }

  if (!token) {
    return (
      <section className="share-panel" aria-labelledby="share-heading">
        <p className="share-empty">아직 공유 링크가 없습니다.</p>
        <div className="share-actions">
          <button
            type="button"
            className="column-add-btn"
            onClick={() => handleGenerateOrRotate(null)}
            disabled={busy}
          >
            {busy ? "생성 중…" : "공유 링크 생성"}
          </button>
        </div>
        <p className="share-status" aria-live="polite">{status}</p>
      </section>
    );
  }

  return (
    <section className="share-panel" aria-labelledby="share-heading">
      <label className="share-label" htmlFor="share-url-input">공유 URL</label>
      <div className="share-actions">
        <input
          id="share-url-input"
          className="share-url-input"
          type="text"
          readOnly
          value={absolute}
          onFocus={(e) => e.currentTarget.select()}
          aria-describedby="share-help"
        />
        <button
          type="button"
          className="column-add-btn"
          onClick={handleCopy}
          aria-label="공유 링크 복사"
          disabled={busy}
        >
          복사
        </button>
        <button
          type="button"
          className="column-inline-add"
          onClick={() =>
            handleGenerateOrRotate("새 링크를 만들면 이전 링크는 즉시 무효화됩니다. 진행할까요?")
          }
          aria-describedby="share-regen-warning"
          disabled={busy}
        >
          새로 생성
        </button>
      </div>
      <p id="share-help" className="share-help">
        이 URL을 학생에게 공유하면 해당 섹션만 볼 수 있어요.
      </p>
      <p id="share-regen-warning" className="share-help share-help-warn">
        새 링크 생성 시 이전 링크는 즉시 무효화됩니다.
      </p>
      <p className="share-status" aria-live="polite">{status}</p>
    </section>
  );
}
