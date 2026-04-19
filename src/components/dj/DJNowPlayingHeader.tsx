"use client";

import { useEffect, useRef } from "react";
import type { CardData } from "../DraggableCard";
import { useDJPlayer } from "./DJPlayerProvider";

type Props = {
  card: CardData;
  canControl: boolean;
  onNext: () => void | Promise<void>;
};

function extractVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  const m2 = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (m2) return m2[1];
  const m3 = url.match(/\/shorts\/([A-Za-z0-9_-]{11})/);
  if (m3) return m3[1];
  return null;
}

export function DJNowPlayingHeader({
  card,
  canControl,
  onNext,
}: Props) {
  const { activeCard, playing, play, toggle, setInlineSlot, setAdvanceHandler } =
    useDJPlayer();
  const inlineRef = useRef<HTMLDivElement | null>(null);

  const submitter =
    card.externalAuthorName ??
    card.studentAuthorName ??
    card.authorName ??
    "";
  const videoId = extractVideoId(card.videoUrl ?? card.linkUrl);
  const isActive = activeCard?.id === card.id;

  // Register our inline slot so the provider portals the iframe here.
  // We DON'T condition on isActive — once the slot is registered, the
  // provider will reuse it for whatever card is playing. This keeps the
  // iframe anchored to the DJ board while mounted.
  useEffect(() => {
    setInlineSlot(inlineRef.current);
    return () => {
      setInlineSlot(null);
    };
  }, [setInlineSlot]);

  // Provider exposes a "next" callback slot that the mini player uses after
  // the current track ends. Point it at the DJ board's own onNext so
  // auto-advance keeps working even when the tab is backgrounded.
  useEffect(() => {
    setAdvanceHandler(() => onNext());
    return () => {
      setAdvanceHandler(null);
    };
  }, [onNext, setAdvanceHandler]);

  // When the now-playing card changes (e.g., auto-advance after a track
  // ended) AND something was previously playing in the provider, load the
  // new track so the user doesn't have to click ▶ again.
  useEffect(() => {
    if (!activeCard) return;
    if (activeCard.id === card.id) return;
    if (!videoId) return;
    play({
      id: card.id,
      title: card.title,
      linkImage: card.linkImage ?? null,
      videoId,
    });
  }, [card.id, card.title, card.linkImage, videoId, activeCard, play]);

  function handlePlayToggle() {
    if (!videoId) return;
    if (isActive) {
      toggle();
    } else {
      play({
        id: card.id,
        title: card.title,
        linkImage: card.linkImage ?? null,
        videoId,
      });
    }
  }

  const showingPlayer = isActive;

  return (
    <section
      className="dj-nowplaying"
      role="status"
      aria-live="polite"
      aria-label={`지금 재생: ${card.title}`}
    >
      <div className="dj-nowplaying-label">▶ NOW PLAYING</div>
      <div className="dj-nowplaying-body">
        <div className="dj-player-wrap">
          {/* Provider portals the YT iframe into this slot when active.
              When idle we show the thumbnail fallback below. */}
          <div
            ref={inlineRef}
            className="dj-player-inline-slot"
            data-empty={showingPlayer ? "false" : "true"}
          />
          {!showingPlayer && card.linkImage && (
            <img
              className="dj-thumb dj-thumb-lg"
              src={card.linkImage}
              width={240}
              height={135}
              alt=""
            />
          )}
        </div>
        <div className="dj-nowplaying-info">
          <div className="dj-track-title">{card.title}</div>
          <div className="dj-track-meta">
            {card.linkDesc && <span>{card.linkDesc}</span>}
            {submitter && <span> · {submitter}님 신청</span>}
          </div>
          <div className="dj-nowplaying-actions">
            {videoId && (
              <button
                type="button"
                className="dj-play-btn"
                onClick={handlePlayToggle}
                aria-label={isActive && playing ? "일시정지" : "재생"}
                aria-pressed={isActive && playing}
              >
                {isActive && playing ? "❚❚ 일시정지" : "▶ 재생"}
              </button>
            )}
            {canControl && (
              <button
                type="button"
                className="dj-next-btn"
                onClick={() => onNext()}
                aria-label="다음 곡으로"
              >
                ⏭ 다음
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
