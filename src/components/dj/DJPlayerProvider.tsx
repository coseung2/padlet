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
  /** 외부 창 PiP (Document Picture-in-Picture) 토글. user-gesture 필요. */
  openExternalPip: () => Promise<void>;
  pipExternalOpen: boolean;
  pipExternalSupported: boolean;
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
  getCurrentTime?: () => number;
};

// Document Picture-in-Picture API (Chrome 116+ / Edge / Safari 16.4+).
// Firefox 미지원 → openExternalPip 시 alert.
type DocumentPipOpts = { width?: number; height?: number };
type DocumentPipManager = {
  requestWindow: (opts?: DocumentPipOpts) => Promise<Window>;
};
declare global {
  interface Window {
    documentPictureInPicture?: DocumentPipManager;
  }
}
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

function buildEmbedUrl(videoId: string, startSec: number): string {
  const params = new URLSearchParams({
    autoplay: "1",
    rel: "0",
    playsinline: "1",
  });
  if (startSec > 0) params.set("start", String(startSec));
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
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
  const [pipExternalOpen, setPipExternalOpen] = useState(false);
  const advanceRef = useRef<(() => Promise<void> | void) | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const pipIframeRef = useRef<HTMLIFrameElement | null>(null);

  const pipExternalSupported =
    typeof window !== "undefined" && "documentPictureInPicture" in window;

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
  // 외부 창 PiP 가 열려 있으면 main 에서는 생성하지 않음 (재생은 PiP 쪽에서).
  useEffect(() => {
    if (!activeCard) return;
    if (pipExternalOpen) {
      // PiP 창이 열려있으면 PiP iframe 의 src 를 갱신 (다음 곡 자동 진행 등).
      if (pipIframeRef.current) {
        pipIframeRef.current.src = buildEmbedUrl(activeCard.videoId, 0);
      }
      return;
    }
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
  }, [activeCard, stop, pipExternalOpen]);

  // 외부 창 PiP 열기 — Document Picture-in-Picture API.
  const openExternalPip = useCallback(async () => {
    if (!activeCard) return;
    if (!pipExternalSupported) {
      alert(
        "이 브라우저는 외부 창 PiP 를 지원하지 않습니다.\nChrome/Edge 116+ 또는 Safari 16.4+ 가 필요해요.",
      );
      return;
    }
    // 이미 열려 있으면 foreground 로 끌어올리기만.
    if (pipWindowRef.current) {
      try {
        pipWindowRef.current.focus();
      } catch {}
      return;
    }

    // 현재 재생 위치 캡처 후 main 플레이어 파괴.
    let startTime = 0;
    if (playerRef.current) {
      try {
        const t = playerRef.current.getCurrentTime?.();
        if (typeof t === "number" && Number.isFinite(t)) startTime = Math.floor(t);
      } catch {}
      try {
        playerRef.current.destroy();
      } catch {}
      playerRef.current = null;
    }
    setPlaying(false);

    const dims = resolvePipPos(pipPos);
    let pipWin: Window;
    try {
      pipWin = await window.documentPictureInPicture!.requestWindow({
        width: Math.max(MIN_W, Math.floor(dims.w)),
        height: Math.max(MIN_H, Math.floor(dims.h)),
      });
    } catch (e) {
      console.warn("[dj-pip] external window denied", e);
      return;
    }
    pipWindowRef.current = pipWin;

    // 최소 style — iframe 을 창 전체로.
    pipWin.document.title = `🎧 ${activeCard.title}`;
    const style = pipWin.document.createElement("style");
    style.textContent = `
      html, body { margin: 0; padding: 0; height: 100%; background: #000; overflow: hidden; }
      iframe { width: 100%; height: 100%; border: 0; display: block; }
    `;
    pipWin.document.head.append(style);

    const iframe = pipWin.document.createElement("iframe");
    iframe.src = buildEmbedUrl(activeCard.videoId, startTime);
    iframe.allow = "autoplay; picture-in-picture; encrypted-media; fullscreen";
    iframe.allowFullscreen = true;
    pipWin.document.body.append(iframe);
    pipIframeRef.current = iframe;

    // 창이 닫히거나 사용자가 메인 창으로 복귀하며 PiP 를 닫을 때.
    // pagehide 가 모든 브라우저에서 가장 신뢰할 수 있는 close signal.
    pipWin.addEventListener("pagehide", () => {
      pipWindowRef.current = null;
      pipIframeRef.current = null;
      setPipExternalOpen(false);
      setPlaying(true);
      // main YT.Player 재생성은 pipExternalOpen 의존성 덕분에 useEffect 가 자동 트리거.
    });

    setPipExternalOpen(true);
  }, [activeCard, pipExternalSupported, pipPos]);

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
    openExternalPip,
    pipExternalOpen,
    pipExternalSupported,
  };

  const visible = !!activeCard;
  const isDocked = !!hostEl && !!hostRect;

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

  // 외부 창 PiP 가 열린 동안에는 main 컨테이너가 텅 빈 상태 — 사용자에게
  // 혼란 없게 "외부 창에서 재생 중" 플레이스홀더 표시. 메인 창을 다시
  // 브라우저 앞으로 끌어온 상태에서 재생 장소를 복원하려면 외부 창을 닫으면 됨.
  const showExternalPlaceholder = visible && pipExternalOpen;

  return (
    <DJPlayerContext.Provider value={value}>
      {children}
      <div className={containerClass} style={containerStyle} aria-hidden={!visible}>
        {visible && (
          <>
            <div className="dj-mini-body">
              {showExternalPlaceholder ? (
                <div className="dj-mini-external-placeholder">
                  <div className="dj-mini-external-emoji">📺</div>
                  <div className="dj-mini-external-title">외부 창에서 재생 중</div>
                  <button
                    type="button"
                    className="dj-mini-btn"
                    onClick={() => pipWindowRef.current?.focus()}
                  >
                    외부 창 보기
                  </button>
                </div>
              ) : (
                <div id={MOUNT_ID} className="dj-mini-iframe" />
              )}
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
                    {!pipExternalOpen && (
                      <button
                        type="button"
                        className="dj-mini-btn"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={toggle}
                        aria-label={playing ? "일시정지" : "재생"}
                      >
                        {playing ? "❚❚" : "▶"}
                      </button>
                    )}
                    {!pipExternalOpen && (
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
                    )}
                    {pipExternalSupported && !pipExternalOpen && (
                      <button
                        type="button"
                        className="dj-mini-btn"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => {
                          void openExternalPip();
                        }}
                        aria-label="외부 창으로 빼기"
                        title="브라우저 최소화해도 계속 재생"
                      >
                        📺
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
