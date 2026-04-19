"use client";

/**
 * Global YouTube playback provider.
 *
 * Owns ONE iframe that survives route navigations. When a DJ board mounts it
 * registers an inline DOM slot via `setInlineSlot`; the provider portals its
 * player UI into that slot so the user sees the full-size embedded player on
 * the DJ board. When the DJ board unmounts (user navigates away) the portal
 * target falls back to a fixed top-right mini container rendered by the
 * provider itself — React moves the iframe DOM between parents, YouTube
 * state persists, playback continues uninterrupted.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export type PlayerCard = {
  id: string;
  title: string;
  linkImage: string | null;
  videoId: string;
};

type Ctx = {
  activeCard: PlayerCard | null;
  playing: boolean;
  /** Begin playing a card. If another track was active it's replaced. */
  play: (card: PlayerCard) => void;
  /** Stop + clear. Mini player disappears. */
  stop: () => void;
  /** Toggle play/pause on the currently active card. */
  toggle: () => void;
  /** DJ board registers the inline slot where it wants the player to render. */
  setInlineSlot: (el: HTMLElement | null) => void;
  /** DJ board passes a handler so mini-player "next" can advance the board queue. */
  setAdvanceHandler: (fn: (() => Promise<void> | void) | null) => void;
};

const DJPlayerContext = createContext<Ctx | null>(null);

export function useDJPlayer() {
  const ctx = useContext(DJPlayerContext);
  if (!ctx) {
    throw new Error("useDJPlayer must be used inside <DJPlayerProvider>");
  }
  return ctx;
}

type YTPlayer = {
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  loadVideoById: (id: string) => void;
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
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: YTState) => void;
          };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytReady: Promise<void> | null = null;
function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (ytReady) return ytReady;
  ytReady = new Promise<void>((resolve) => {
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
  return ytReady;
}

const MOUNT_ID = "dj-global-yt-player";

export function DJPlayerProvider({ children }: { children: React.ReactNode }) {
  const [activeCard, setActiveCard] = useState<PlayerCard | null>(null);
  const [playing, setPlaying] = useState(false);
  const [inlineSlot, setInlineSlot] = useState<HTMLElement | null>(null);
  const miniRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  // Advance handler set by the DJ board — null when no DJ board is mounted
  // (then the mini "next" button is hidden).
  const advanceRef = useRef<(() => Promise<void> | void) | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const play = useCallback((card: PlayerCard) => {
    setActiveCard(card);
    setPlaying(true);
  }, []);

  const stop = useCallback(() => {
    setActiveCard(null);
    setPlaying(false);
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch {
        // already destroyed
      }
      playerRef.current = null;
    }
  }, []);

  const toggle = useCallback(() => {
    if (!playerRef.current) return;
    if (playing) {
      try {
        playerRef.current.pauseVideo();
      } catch {}
      setPlaying(false);
    } else {
      try {
        playerRef.current.playVideo();
      } catch {}
      setPlaying(true);
    }
  }, [playing]);

  const setAdvanceHandler = useCallback(
    (fn: (() => Promise<void> | void) | null) => {
      advanceRef.current = fn;
    },
    []
  );

  // Attach YT.Player when the iframe mount div is first rendered for a card.
  // We destroy + recreate when activeCard.videoId changes so loadVideoById
  // isn't needed — simpler state machine.
  useEffect(() => {
    if (!activeCard) return;
    let cancelled = false;
    loadYouTubeAPI().then(() => {
      if (cancelled) return;
      if (!window.YT?.Player) return;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
      playerRef.current = new window.YT.Player(MOUNT_ID, {
        videoId: activeCard.videoId,
        playerVars: { autoplay: 1, rel: 0, playsinline: 1 },
        events: {
          onReady: (e) => {
            try {
              e.target.playVideo();
            } catch {}
          },
          onStateChange: (e) => {
            if (e.data === 0) {
              // Ended — advance the DJ board queue if it's still mounted.
              // If not, the user has navigated away; stop the mini player.
              const advance = advanceRef.current;
              if (advance) {
                Promise.resolve(advance()).catch(() => {
                  /* swallow — stop cleanly */
                });
              } else {
                stop();
              }
            } else if (e.data === 1) {
              setPlaying(true);
            } else if (e.data === 2) {
              setPlaying(false);
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [activeCard, stop]);

  const value: Ctx = {
    activeCard,
    playing,
    play,
    stop,
    toggle,
    setInlineSlot,
    setAdvanceHandler,
  };

  // Player DOM is a single div. createPortal targets the inline slot if
  // registered, else the provider's own fixed mini container. React moves
  // the DOM node between targets — iframe state (and audio) survives.
  const target = mounted ? inlineSlot ?? miniRef.current : null;

  return (
    <DJPlayerContext.Provider value={value}>
      {children}
      {/* Mini fallback container — sits top-right when no inline slot owns the player. */}
      <div
        ref={miniRef}
        className={`dj-mini-player ${
          activeCard && !inlineSlot ? "is-visible" : "is-hidden"
        }`}
        aria-hidden={!activeCard || !!inlineSlot}
      >
        {activeCard && !inlineSlot && (
          <div className="dj-mini-header">
            <div className="dj-mini-title" title={activeCard.title}>
              {activeCard.title}
            </div>
            <div className="dj-mini-actions">
              <button
                type="button"
                className="dj-mini-btn"
                onClick={toggle}
                aria-label={playing ? "일시정지" : "재생"}
              >
                {playing ? "❚❚" : "▶"}
              </button>
              {advanceRef.current && (
                <button
                  type="button"
                  className="dj-mini-btn"
                  onClick={() => advanceRef.current?.()}
                  aria-label="다음 곡"
                >
                  ⏭
                </button>
              )}
              <button
                type="button"
                className="dj-mini-btn dj-mini-close"
                onClick={stop}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
      {activeCard && target &&
        createPortal(
          <div className="dj-player-body">
            <div id={MOUNT_ID} className="dj-player-iframe" />
          </div>,
          target
        )}
    </DJPlayerContext.Provider>
  );
}
