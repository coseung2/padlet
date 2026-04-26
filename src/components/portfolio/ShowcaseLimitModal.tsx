"use client";

import { useEffect, useState } from "react";
import type { PortfolioCardDTO } from "@/lib/portfolio-dto";
import { buildSourceLabel } from "./source-label";

type Props = {
  showcased: PortfolioCardDTO[];
  onCancel: () => void;
  onConfirm: (removeCardId: string) => void;
};

export function ShowcaseLimitModal({ showcased, onCancel, onConfirm }: Props) {
  const [pickedId, setPickedId] = useState<string>(showcased[0]?.id ?? "");

  // ESC = 취소, focus trap 은 backdrop click + button focus 로 단순화
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="자랑해요 한도 안내"
    >
      <div className="showcase-limit-modal">
        <header className="showcase-limit-head">
          <h3>🌟 자랑해요는 3개까지예요</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            aria-label="닫기"
          >
            ×
          </button>
        </header>
        <p className="showcase-limit-msg">
          새 카드를 자랑해요에 올리려면 기존 자랑해요 중 1개를 내려야 해요.
        </p>
        <ul className="showcase-limit-list">
          {showcased.map((c) => {
            const sourceLabel = buildSourceLabel({
              boardTitle: c.sourceBoard.title,
              boardLayout: c.sourceBoard.layout,
              sectionTitle: c.sourceSection?.title ?? null,
            });
            return (
              <li key={c.id}>
                <label className="showcase-limit-item">
                  <input
                    type="radio"
                    name="showcase-pick"
                    value={c.id}
                    checked={pickedId === c.id}
                    onChange={() => setPickedId(c.id)}
                  />
                  <div className="showcase-limit-thumb" aria-hidden>
                    {c.thumbUrl || c.imageUrl || c.linkImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.thumbUrl || c.imageUrl || c.linkImage || ""}
                        alt=""
                      />
                    ) : (
                      <span className="showcase-limit-thumb-placeholder">
                        📄
                      </span>
                    )}
                  </div>
                  <div className="showcase-limit-meta">
                    <strong>{c.title || "제목 없음"}</strong>
                    <span>{sourceLabel}</span>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
        <footer className="showcase-limit-foot">
          <button
            type="button"
            className="modal-btn-cancel"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            type="button"
            className="modal-btn-submit"
            onClick={() => onConfirm(pickedId)}
            disabled={!pickedId}
          >
            내리고 새로 올리기
          </button>
        </footer>
      </div>
    </div>
  );
}
