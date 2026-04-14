"use client";

import { useEffect } from "react";
import { CardAttachments } from "../CardAttachments";
import { CardAuthorFooter } from "./CardAuthorFooter";
import type { CardData } from "../DraggableCard";

type Props = {
  card: CardData | null;
  onClose: () => void;
};

export function CardDetailModal({ card, onClose }: Props) {
  useEffect(() => {
    if (!card) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [card, onClose]);

  if (!card) return null;

  const hasMedia =
    Boolean(card.imageUrl) ||
    Boolean(card.linkImage) ||
    Boolean(card.videoUrl) ||
    Boolean(card.linkUrl);

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="add-card-modal card-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label={card.title}
        data-has-media={hasMedia ? "true" : "false"}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close card-detail-close"
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>
        <div className="card-detail-body">
          {hasMedia && (
            <section className="card-detail-media" aria-label="첨부">
              <CardAttachments
                imageUrl={card.imageUrl}
                linkUrl={card.linkUrl}
                linkTitle={card.linkTitle}
                linkDesc={card.linkDesc}
                linkImage={card.linkImage}
                videoUrl={card.videoUrl}
              />
            </section>
          )}
          <aside className="card-detail-side">
            <h2 className="card-detail-title">{card.title}</h2>
            {card.content && (
              <p className="card-detail-content">{card.content}</p>
            )}
            {card.linkUrl && (
              <a
                href={card.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="card-detail-link"
              >
                🔗 원본 열기
              </a>
            )}
            <CardAuthorFooter
              externalAuthorName={card.externalAuthorName}
              studentAuthorName={card.studentAuthorName}
              authorName={card.authorName}
              createdAt={card.createdAt}
            />
          </aside>
        </div>
      </div>
    </>
  );
}
