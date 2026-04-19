"use client";

/**
 * Global YouTube playback provider.
 *
 * A single iframe lives in the provider's own fixed container and NEVER
 * moves — no React portals, no DOM re-parenting. The previous portal-based
 * approach lost the iframe when a DJ board unmounted (the portal target
 * died with its component tree). Anchoring the iframe at root level means
 * playback survives every navigation.
 *
 * The visual trade-off: instead of rendering inside the DJ board's NOW
 * PLAYING card, the player lives in a fixed container that switches size /
 * position based on whether a DJ board is active ("prominent" bottom-right
 * vs "compact" top-right). The DJ board's NOW PLAYING section still shows
 * track thumbnail + title + controls — it's the "info card" half, while the
 * provider owns the "playback" half.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type PlayerCard = {
  id: string;
  title: string;
  linkImage: string | null;
  videoId: string;
};

type Ctx = {
  activeCard: PlayerCard | null;
  playing: boolean;
  play: (card: PlayerCard) => void;
  stop: () => void;
  toggle: () => void;
  /** Toggle "prominent" mode on. DJ boards call this on mount. */
  setExpanded: (on: boolean) => void;
  /** Register a next-track handler. DJ boards pass their onNext. */
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
  const [expanded, setExpanded] = useState(false);
  const advanceRef = useRef<(() => Promise<void> | void) | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);

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
        // ignore
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

  // Attach / re-attach YT.Player when activeCard.videoId changes.
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
              // Ended → advance the DJ board queue if still mounted.
              const advance = advanceRef.current;
              if (advance) {
                Promise.resolve(advance()).catch(() => {});
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

  // Media Session API — lets the OS treat this page as a playing-media app.
  // Mobile browsers will usually allow background audio + show lock-screen
  // controls only when metadata + action handlers are set. No-op on browsers
  // without support.
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;

    if (!activeCard) {
      ms.metadata = null;
      ms.playbackState = "none";
      return;
    }

    ms.metadata = new window.MediaMetadata({
      title: activeCard.title,
      artist: "DJ 큐",
      artwork: activeCard.linkImage
        ? [
            { src: activeCard.linkImage, sizes: "480x360", type: "image/jpeg" },
            { src: activeCard.linkImage, sizes: "320x180", type: "image/jpeg" },
          ]
        : [],
    });

    const handlers: Array<[MediaSessionAction, () => void]> = [
      [
        "play",
        () => {
          if (playerRef.current) {
            try {
              playerRef.current.playVideo();
            } catch {}
            setPlaying(true);
          }
        },
      ],
      [
        "pause",
        () => {
          if (playerRef.current) {
            try {
              playerRef.current.pauseVideo();
            } catch {}
            setPlaying(false);
          }
        },
      ],
      [
        "nexttrack",
        () => {
          advanceRef.current?.();
        },
      ],
    ];
    for (const [action, fn] of handlers) {
      try {
        ms.setActionHandler(action, fn);
      } catch {
        // unsupported action on this browser — skip
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          ms.setActionHandler(action, null);
        } catch {}
      }
    };
  }, [activeCard]);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }, [playing]);

  const value: Ctx = {
    activeCard,
    playing,
    play,
    stop,
    toggle,
    setExpanded,
    setAdvanceHandler,
  };

  const visible = !!activeCard;
  const containerClass = [
    "dj-mini-player",
    visible ? "is-visible" : "is-hidden",
    expanded ? "is-expanded" : "is-compact",
  ].join(" ");

  return (
    <DJPlayerContext.Provider value={value}>
      {children}
      <div className={containerClass} aria-hidden={!visible}>
        {visible && (
          <>
            <div className="dj-mini-body">
              <div id={MOUNT_ID} className="dj-mini-iframe" />
            </div>
            <div className="dj-mini-header">
              <div className="dj-mini-title" title={activeCard?.title}>
                {activeCard?.title}
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
                <button
                  type="button"
                  className="dj-mini-btn"
                  onClick={() => advanceRef.current?.()}
                  aria-label="다음 곡"
                  disabled={!advanceRef.current}
                  style={{ opacity: advanceRef.current ? 1 : 0.4 }}
                >
                  ⏭
                </button>
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
          </>
        )}
      </div>
    </DJPlayerContext.Provider>
  );
}
