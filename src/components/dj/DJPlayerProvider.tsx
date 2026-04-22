"use client";

/**
 * Global YouTube playback provider — 2026-04-22 docked+PiP 리팩터.
 *
 * 핵심 아이디어: iframe 은 root 에 단 하나 살아있고 **시각적으로만 이동**.
 * 호스트 엘리먼트(예: DJ 보드의 NOW PLAYING 썸네일 자리) 가 등록되면
 * 그 DOM 의 getBoundingClientRect 를 tracking 하여 fixed 포지션으로
 * 덮어씌움. 호스트가 없으면 우하단 PiP 로 floating.
 *
 * iframe 이 실제로 re-parent 되는 게 아니라 그냥 CSS 로 옮겨지므로
 * YouTube 재생 상태는 모든 navigation / 호스트 변경에 생존한다.
 *
 * PiP 모드 추가 기능:
 *  - 헤더 잡고 드래그로 이동 (pipPos 상태 → localStorage 영구 저장)
 *  - 우하단 핸들 드래그로 리사이즈
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
  /** Auto-advance 를 provider 레벨에서 수행할 수 있게 DJ 보드 id 를 동봉.
   *  DJ 보드를 벗어나 PiP 로 내려앉은 상태에서 곡 끝났을 때도 다음 곡
   *  자동 진행. */
  boardId: string;
};

type Ctx = {
  activeCard: PlayerCard | null;
  playing: boolean;
  play: (card: PlayerCard) => void;
  stop: () => void;
  toggle: () => void;
  /**
   * Register a "host" DOM element — the player iframe will be visually
   * positioned over this element while it is mounted. Passing null moves
   * the iframe back into PiP floating mode.
   */
  registerHost: (el: HTMLElement | null) => void;
  setAdvanceHandler: (fn: (() => Promise<void> | void) | null) => void;
  /**
   * PiP 수동 토글. host 가 있어도 true 면 floating 으로 강제.
   * 기본은 false → host 있으면 docked, 없으면 auto PiP.
   */
  manualPip: boolean;
  setManualPip: (on: boolean) => void;
  /** host 여부를 소비자가 알아야 "도킹 복귀" 버튼을 보일지 판단 가능. */
  hasHost: boolean;
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
        },
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
const PIP_STORAGE_KEY = "djPipPos";
const DEFAULT_PIP = { x: -1, y: -1, w: 360, h: 260 }; // -1 = "anchor to right/bottom"
const MIN_W = 240;
const MIN_H = 180;

/** YouTube URL → 11자 videoId. 같은 함수가 NowPlayingHeader 에도 있지만
 *  provider 의 auto-advance 경로에서 재사용하려 여기도 복사 (cross-import
 *  순환을 피하기 위함). */
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

type PipPos = { x: number; y: number; w: number; h: number };

function loadPipPos(): PipPos {
  if (typeof window === "undefined") return DEFAULT_PIP;
  try {
    const raw = localStorage.getItem(PIP_STORAGE_KEY);
    if (!raw) return DEFAULT_PIP;
    const parsed = JSON.parse(raw) as Partial<PipPos>;
    return {
      x: typeof parsed.x === "number" ? parsed.x : DEFAULT_PIP.x,
      y: typeof parsed.y === "number" ? parsed.y : DEFAULT_PIP.y,
      w: Math.max(MIN_W, typeof parsed.w === "number" ? parsed.w : DEFAULT_PIP.w),
      h: Math.max(MIN_H, typeof parsed.h === "number" ? parsed.h : DEFAULT_PIP.h),
    };
  } catch {
    return DEFAULT_PIP;
  }
}

function savePipPos(p: PipPos) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PIP_STORAGE_KEY, JSON.stringify(p));
  } catch {
    // quota / disabled — ignore
  }
}

export function DJPlayerProvider({ children }: { children: React.ReactNode }) {
  const [activeCard, setActiveCard] = useState<PlayerCard | null>(null);
  const [playing, setPlaying] = useState(false);
  const [hostEl, setHostEl] = useState<HTMLElement | null>(null);
  const [hostRect, setHostRect] = useState<DOMRect | null>(null);
  const [pipPos, setPipPos] = useState<PipPos>(DEFAULT_PIP);
  const [manualPip, setManualPip] = useState(false);
  const advanceRef = useRef<(() => Promise<void> | void) | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  /** activeCard 를 ref 로 미러 — YT.Player onStateChange 클로저가 최신 값
   *  접근 가능하게. */
  const activeCardRef = useRef<PlayerCard | null>(null);
  /** autoAdvance 를 ref 로 미러 — 동일 이유. */
  const autoAdvanceRef = useRef<() => void>(() => {});

  useEffect(() => {
    activeCardRef.current = activeCard;
  }, [activeCard]);

  // PiP 위치 — mount 시 localStorage 로드 (SSR 안전).
  useEffect(() => {
    setPipPos(loadPipPos());
  }, []);

  useEffect(() => {
    savePipPos(pipPos);
  }, [pipPos]);

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

  const registerHost = useCallback((el: HTMLElement | null) => {
    setHostEl(el);
  }, []);

  const setAdvanceHandler = useCallback(
    (fn: (() => Promise<void> | void) | null) => {
      advanceRef.current = fn;
    },
    [],
  );

  /**
   * PiP (DJ 보드 언마운트 상태) 에서 곡이 끝났을 때 provider 자체에서 다음
   * 곡 찾아 재생.
   *   1) PATCH /api/boards/:id/queue/:cardId status=played
   *   2) GET   /api/boards/:id/queue/next → { card }
   *   3) 있으면 play(), 없으면 stop().
   * DJ 보드가 마운트된 상태면 advanceRef 가 채워져 있어 이쪽 경로는 안 탄다.
   */
  const autoAdvanceFromProvider = useCallback(async () => {
    const current = activeCardRef.current;
    if (!current?.boardId) {
      stop();
      return;
    }
    try {
      await fetch(
        `/api/boards/${encodeURIComponent(current.boardId)}/queue/${encodeURIComponent(current.id)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "played" }),
        },
      );
    } catch (e) {
      console.warn("[dj] auto-advance PATCH failed", e);
      // played 기록 실패해도 다음 곡 시도는 해볼 가치 있음
    }
    try {
      const res = await fetch(
        `/api/boards/${encodeURIComponent(current.boardId)}/queue/next`,
      );
      if (!res.ok) {
        stop();
        return;
      }
      const body = (await res.json()) as {
        card: {
          id: string;
          title: string;
          linkImage: string | null;
          videoUrl: string | null;
          linkUrl: string | null;
        } | null;
      };
      if (!body.card) {
        stop();
        return;
      }
      const vid = extractVideoId(body.card.videoUrl ?? body.card.linkUrl);
      if (!vid) {
        stop();
        return;
      }
      play({
        id: body.card.id,
        title: body.card.title,
        linkImage: body.card.linkImage,
        videoId: vid,
        boardId: current.boardId,
      });
    } catch (e) {
      console.warn("[dj] auto-advance next fetch failed", e);
      stop();
    }
  }, [play, stop]);

  useEffect(() => {
    autoAdvanceRef.current = () => {
      Promise.resolve(autoAdvanceFromProvider()).catch(() => {});
    };
  }, [autoAdvanceFromProvider]);

  // Host rect 추적 — ResizeObserver + window resize + scroll. 모든 이벤트에
  // 대해 최신 getBoundingClientRect 를 state 로 push.
  useEffect(() => {
    if (!hostEl) {
      setHostRect(null);
      return;
    }
    function update() {
      if (hostEl) setHostRect(hostEl.getBoundingClientRect());
    }
    update();
    const ro = new ResizeObserver(update);
    ro.observe(hostEl);
    window.addEventListener("resize", update);
    // capture:true — 내부 스크롤 컨테이너 이동도 잡기 위해.
    window.addEventListener("scroll", update, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [hostEl]);

  // YT.Player 생성 — activeCard.videoId 변경 시 재부착.
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
              const advance = advanceRef.current;
              if (advance) {
                Promise.resolve(advance()).catch(() => {});
              } else {
                // DJ 보드가 언마운트된 PiP 상황 — provider 가 직접 다음 곡.
                autoAdvanceRef.current();
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

  // Media Session — lock-screen/OS 컨트롤.
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
      } catch {}
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

  // PiP 드래그 — 헤더 onMouseDown 에서 트리거. 전역 mousemove/up 등록.
  const startDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (hostEl) return; // docked 상태에선 드래그 불가
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const origPos = resolvePipPos(pipPos);
      function onMove(ev: PointerEvent) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const nx = Math.max(0, Math.min(vw - origPos.w, origPos.x + ev.clientX - startX));
        const ny = Math.max(0, Math.min(vh - origPos.h, origPos.y + ev.clientY - startY));
        setPipPos((p) => ({ ...p, x: nx, y: ny }));
      }
      function onUp() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [hostEl, pipPos],
  );

  // PiP 리사이즈 — 3면 핸들(우/하/우하단). direction 별로 w/h 독립 변경.
  type ResizeDir = "e" | "s" | "se";
  const startResize = useCallback(
    (dir: ResizeDir) =>
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (hostEl) return;
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const orig = resolvePipPos(pipPos);
        function onMove(ev: PointerEvent) {
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const maxW = vw - orig.x;
          const maxH = vh - orig.y;
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          let nw = orig.w;
          let nh = orig.h;
          if (dir === "e" || dir === "se") {
            nw = Math.max(MIN_W, Math.min(maxW, orig.w + dx));
          }
          if (dir === "s" || dir === "se") {
            nh = Math.max(MIN_H, Math.min(maxH, orig.h + dy));
          }
          setPipPos((p) => ({ ...p, w: nw, h: nh, x: orig.x, y: orig.y }));
        }
        function onUp() {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
        }
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      },
    [hostEl, pipPos],
  );

  const value: Ctx = {
    activeCard,
    playing,
    play,
    stop,
    toggle,
    registerHost,
    setAdvanceHandler,
    manualPip,
    setManualPip,
    hasHost: !!hostEl,
  };

  const visible = !!activeCard;
  // manualPip 가 켜져 있으면 host 가 있어도 floating PiP 로 렌더.
  const isDocked = !manualPip && !!hostEl && !!hostRect;

  // Container style — docked 모드는 hostRect, PiP 모드는 pipPos.
  let containerStyle: React.CSSProperties = { display: "none" };
  if (visible) {
    if (isDocked && hostRect) {
      containerStyle = {
        position: "fixed",
        left: hostRect.left,
        top: hostRect.top,
        width: hostRect.width,
        height: hostRect.height,
        borderRadius: 8,
        background: "#000",
        boxShadow: "none",
      };
    } else {
      const resolved = resolvePipPos(pipPos);
      containerStyle = {
        position: "fixed",
        left: resolved.x,
        top: resolved.y,
        width: resolved.w,
        height: resolved.h,
      };
    }
  }

  const containerClass = [
    "dj-mini-player",
    visible ? "is-visible" : "is-hidden",
    isDocked ? "is-docked" : "is-pip",
  ].join(" ");

  return (
    <DJPlayerContext.Provider value={value}>
      {children}
      <div className={containerClass} style={containerStyle} aria-hidden={!visible}>
        {visible && (
          <>
            <div className="dj-mini-body">
              <div id={MOUNT_ID} className="dj-mini-iframe" />
            </div>
            {!isDocked && (
              <>
                <div className="dj-mini-header" onPointerDown={startDrag}>
                  <div className="dj-mini-drag-hint" aria-hidden="true">
                    ⋮⋮
                  </div>
                  <div className="dj-mini-title" title={activeCard?.title}>
                    {activeCard?.title}
                  </div>
                  <div className="dj-mini-actions">
                    <button
                      type="button"
                      className="dj-mini-btn"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={toggle}
                      aria-label={playing ? "일시정지" : "재생"}
                    >
                      {playing ? "❚❚" : "▶"}
                    </button>
                    <button
                      type="button"
                      className="dj-mini-btn"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => advanceRef.current?.()}
                      aria-label="다음 곡"
                      disabled={!advanceRef.current}
                      style={{ opacity: advanceRef.current ? 1 : 0.4 }}
                    >
                      ⏭
                    </button>
                    {/* host 가 있을 때만 "도킹 복귀" 버튼 노출. host 가 없는 일반
                       페이지에선 이미 PiP 가 기본이라 이 버튼이 무의미. */}
                    {hostEl && manualPip && (
                      <button
                        type="button"
                        className="dj-mini-btn"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setManualPip(false)}
                        aria-label="도킹으로 돌리기"
                        title="NOW PLAYING 카드로 되돌리기"
                      >
                        🪝
                      </button>
                    )}
                    <button
                      type="button"
                      className="dj-mini-btn dj-mini-close"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={stop}
                      aria-label="닫기"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div
                  className="dj-mini-resize dj-mini-resize-e"
                  onPointerDown={startResize("e")}
                  aria-hidden="true"
                  title="너비 조절"
                />
                <div
                  className="dj-mini-resize dj-mini-resize-s"
                  onPointerDown={startResize("s")}
                  aria-hidden="true"
                  title="높이 조절"
                />
                <div
                  className="dj-mini-resize dj-mini-resize-se"
                  onPointerDown={startResize("se")}
                  aria-hidden="true"
                  title="크기 조절"
                />
              </>
            )}
          </>
        )}
      </div>
    </DJPlayerContext.Provider>
  );
}

/** DEFAULT_PIP 의 -1 sentinel 을 실제 뷰포트 기준 "우하단 기본 위치" 로 해석. */
function resolvePipPos(p: PipPos): PipPos {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const x = p.x < 0 ? Math.max(0, vw - p.w - 20) : p.x;
  const y = p.y < 0 ? Math.max(0, vh - p.h - 20) : p.y;
  return { x, y, w: p.w, h: p.h };
}
