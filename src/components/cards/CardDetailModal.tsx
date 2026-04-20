"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CardAttachments } from "../CardAttachments";
import { CardAuthorFooter } from "./CardAuthorFooter";
import type { CardData } from "../DraggableCard";

type Props = {
  card: CardData | null;
  onClose: () => void;
  /** Optional: cards list + setter for prev/next navigation. */
  cards?: CardData[];
  onChange?: (card: CardData) => void;
  /** Teacher-only: opens CardAuthorEditor from inside the modal. When
   *  undefined the author-edit button is hidden (student/parent path). */
  onEditAuthors?: (card: CardData) => void;
};

export function CardDetailModal({
  card,
  onClose,
  cards,
  onChange,
  onEditAuthors,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const navIndex = useMemo(() => {
    if (!card || !cards || cards.length === 0) return -1;
    return cards.findIndex((c) => c.id === card.id);
  }, [card, cards]);

  const goPrev = useCallback(() => {
    if (!cards || navIndex < 0) return;
    const next = cards[(navIndex - 1 + cards.length) % cards.length];
    if (next) onChange?.(next);
  }, [cards, navIndex, onChange]);

  const goNext = useCallback(() => {
    if (!cards || navIndex < 0) return;
    const next = cards[(navIndex + 1) % cards.length];
    if (next) onChange?.(next);
  }, [cards, navIndex, onChange]);

  useEffect(() => {
    if (!card) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !document.fullscreenElement) onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [card, onClose, goPrev, goNext]);

  // Sync local state with the browser's fullscreen lifecycle so exiting
  // via F11/ESC flips the button back without an extra click.
  useEffect(() => {
    function onChange() {
      setIsFullscreen(document.fullscreenElement === rootRef.current);
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = rootRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      // Some browsers block fullscreen without user activation; no-op.
    }
  }, []);

  if (!card) return null;

  const hasMedia =
    Boolean(card.imageUrl) ||
    Boolean(card.linkImage) ||
    Boolean(card.videoUrl) ||
    Boolean(card.linkUrl) ||
    Boolean(card.fileUrl);

  return (
    <>
      {!isFullscreen && (
        <div className="modal-backdrop" onClick={onClose} />
      )}
      <div
        ref={rootRef}
        className="add-card-modal card-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label={card.title}
        data-has-media={hasMedia ? "true" : "false"}
        data-fullscreen={isFullscreen ? "true" : "false"}
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
        <button
          type="button"
          className="card-detail-fullscreen"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "전체화면 끄기" : "전체화면 켜기"}
          title={isFullscreen ? "전체화면 끄기" : "전체화면으로 발표"}
        >
          {isFullscreen ? "⤫" : "⛶"}
        </button>
        {cards && cards.length > 1 && navIndex >= 0 && (
          <>
            <button
              type="button"
              className="card-detail-nav card-detail-nav-prev"
              onClick={goPrev}
              aria-label="이전 카드"
            >
              ‹
            </button>
            <button
              type="button"
              className="card-detail-nav card-detail-nav-next"
              onClick={goNext}
              aria-label="다음 카드"
            >
              ›
            </button>
          </>
        )}
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
                fileUrl={card.fileUrl}
                fileName={card.fileName}
                fileSize={card.fileSize}
                fileMimeType={card.fileMimeType}
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
              authors={card.authors}
              externalAuthorName={card.externalAuthorName}
              studentAuthorName={card.studentAuthorName}
              authorName={card.authorName}
              createdAt={card.createdAt}
            />
            {onEditAuthors && (
              <button
                type="button"
                className="card-detail-edit-authors"
                onClick={() => onEditAuthors(card)}
              >
                👥 작성자 지정
              </button>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
