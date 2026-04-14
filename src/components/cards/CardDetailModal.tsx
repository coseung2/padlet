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

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="add-card-modal card-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label={card.title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">{card.title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <div className="modal-body card-detail-body">
          <CardAttachments
            imageUrl={card.imageUrl}
            linkUrl={card.linkUrl}
            linkTitle={card.linkTitle}
            linkDesc={card.linkDesc}
            linkImage={card.linkImage}
            videoUrl={card.videoUrl}
          />
          {card.content && (
            <p className="padlet-card-content card-detail-content">{card.content}</p>
          )}
          <CardAuthorFooter
            externalAuthorName={card.externalAuthorName}
            studentAuthorName={card.studentAuthorName}
            authorName={card.authorName}
            createdAt={card.createdAt}
          />
        </div>
      </div>
    </>
  );
}
