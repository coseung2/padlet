"use client";

/**
 * Teacher QR + link share card (ES-4).
 *
 * Fetches SVG on demand (/api/event/qr) and caches until token rotates.
 * Rotate button lives in parent so state propagation is explicit.
 */
import { useCallback, useEffect, useState } from "react";

type Props = {
  boardId: string;
  publicUrl: string | null;
  mode: string;
  onRotate: () => void;
  rotating: boolean;
  err: string | null;
};

export function QrShareCard({ boardId, publicUrl, mode, onRotate, rotating, err }: Props) {
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!publicUrl) {
      setSvg(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/event/qr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ boardId }),
      });
      if (!res.ok) {
        setSvg(null);
        return;
      }
      const j = await res.json();
      setSvg(typeof j.svg === "string" ? j.svg : null);
    } finally {
      setLoading(false);
    }
  }, [boardId, publicUrl]);

  useEffect(() => {
    reload();
  }, [reload]);

  const copy = useCallback(async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
    } catch {
      /* ignore */
    }
  }, [publicUrl]);

  return (
    <div className="qr-share-card">
      <h3>공유 QR / 링크</h3>
      {mode !== "public-link" || !publicUrl ? (
        <p className="qr-empty">
          공개 링크가 발급되지 않았습니다. 아래 버튼으로 발급하세요.
          <br />
          <button
            type="button"
            className="btn btn-primary"
            onClick={onRotate}
            disabled={rotating}
          >
            {rotating ? "발급 중…" : "공개 링크 발급"}
          </button>
        </p>
      ) : (
        <>
          <div className="qr-wrap">
            {loading && <span>QR 생성 중…</span>}
            {!loading && svg && (
              <div
                aria-label="행사 신청 QR"
                role="img"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            )}
          </div>
          <div className="qr-link-row">
            <input
              readOnly
              value={publicUrl}
              aria-label="공유 링크"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button type="button" onClick={copy} className="btn">
              복사
            </button>
          </div>
          <div className="qr-actions">
            <button
              type="button"
              className="btn"
              onClick={onRotate}
              disabled={rotating}
              aria-describedby="qr-rotate-note"
            >
              {rotating ? "회전 중…" : "토큰 재발급"}
            </button>
            <span id="qr-rotate-note" className="qr-hint">
              이전 QR은 즉시 무효화됩니다.
            </span>
          </div>
        </>
      )}
      {err && <p className="qr-err" role="alert">{err}</p>}
    </div>
  );
}
