"use client";

import { useEffect, useRef, useState } from "react";
import type { CardData } from "../DraggableCard";

type Props = {
  card: CardData;
  canControl: boolean;
  onNext: () => void;
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

// Minimal YT.Player surface we use. Attach types here to avoid a full
// `@types/youtube` dep.
type YTPlayer = {
  destroy: () => void;
};
type YTState = { data: number };
declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        config: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onStateChange?: (e: YTState) => void;
            onReady?: (e: { target: { playVideo: () => void } }) => void;
          };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

// Load YT IFrame API once per page. Subsequent callers just wait for the
// script to finish. Resolves when window.YT.Player is available.
let ytReadyPromise: Promise<void> | null = null;
function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (ytReadyPromise) return ytReadyPromise;
  ytReadyPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
  return ytReadyPromise;
}

export function DJNowPlayingHeader({ card, canControl, onNext }: Props) {
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef<YTPlayer | null>(null);
  const mountIdRef = useRef(`dj-yt-player-${card.id}`);
  // Keep the latest onNext in a ref so the YT event handler doesn't close
  // over a stale callback (important for auto-advance after card changes).
  const onNextRef = useRef(onNext);
  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);

  const submitter =
    card.externalAuthorName ??
    card.studentAuthorName ??
    card.authorName ??
    "";
  const videoId = extractVideoId(card.videoUrl ?? card.linkUrl);

  // When card changes, reset player state.
  useEffect(() => {
    mountIdRef.current = `dj-yt-player-${card.id}`;
    setPlaying(false);
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch {
        // already destroyed
      }
      playerRef.current = null;
    }
  }, [card.id]);

  // Attach / tear down YT player when `playing` toggles.
  useEffect(() => {
    if (!playing || !videoId) {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
      return;
    }

    let cancelled = false;
    loadYouTubeAPI().then(() => {
      if (cancelled) return;
      if (!window.YT?.Player) return;
      playerRef.current = new window.YT.Player(mountIdRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: (e) => {
            try {
              e.target.playVideo();
            } catch {
              // autoplay can be blocked by browser policy — user click should
              // satisfy user-activation anyway
            }
          },
          onStateChange: (e) => {
            // data 0 = ended. Auto-advance to the next queued track.
            if (e.data === 0) {
              setPlaying(false);
              onNextRef.current();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [playing, videoId]);

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
            <div id={mountIdRef.current} className="dj-player-iframe" />
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
