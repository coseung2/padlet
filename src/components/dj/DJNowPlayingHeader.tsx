"use client";

import { useState } from "react";
import type { CardData } from "../DraggableCard";

type Props = {
  card: CardData;
  canControl: boolean;
  onNext: () => void;
};

function extractVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  // canonical: https://www.youtube.com/watch?v=<11-char>
  const m = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  // youtu.be/<id>
  const m2 = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (m2) return m2[1];
  // /shorts/<id>
  const m3 = url.match(/\/shorts\/([A-Za-z0-9_-]{11})/);
  if (m3) return m3[1];
  return null;
}

export function DJNowPlayingHeader({ card, canControl, onNext }: Props) {
  const [playing, setPlaying] = useState(false);
  const submitter =
    card.externalAuthorName ??
    card.studentAuthorName ??
    card.authorName ??
    "";
  const videoId = extractVideoId(card.videoUrl ?? card.linkUrl);

  return (
    <section
      className="dj-nowplaying"
      role="status"
      aria-live="polite"
      aria-label={`지금 재생: ${card.title}`}
    >
      <div className="dj-nowplaying-label">▶ NOW PLAYING</div>
      <div className="dj-nowplaying-body">
        {playing && videoId ? (
          <div className="dj-player-wrap">
            <iframe
              className="dj-player-iframe"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title={card.title}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          card.linkImage && (
            <img
              className="dj-thumb dj-thumb-lg"
              src={card.linkImage}
              width={240}
              height={135}
              alt=""
            />
          )
        )}
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
                onClick={() => setPlaying((v) => !v)}
                aria-label={playing ? "재생 중지" : "재생"}
                aria-pressed={playing}
              >
                {playing ? "■ 정지" : "▶ 재생"}
              </button>
            )}
            {canControl && (
              <button
                type="button"
                className="dj-next-btn"
                onClick={() => {
                  setPlaying(false);
                  onNext();
                }}
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
