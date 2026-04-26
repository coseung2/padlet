"use client";

import type { MutableRefObject } from "react";
import type { PlayerCard } from "./DJPlayerProvider";

type Props = {
  mountId: string;
  activeCard: PlayerCard | null;
  containerStyle: React.CSSProperties;
  containerClass: string;
  visible: boolean;
  isDocked: boolean;
  hostEl: HTMLElement | null;
  manualPip: boolean;
  playing: boolean;
  toggle: () => void;
  stop: () => void;
  setManualPip: (on: boolean) => void;
  advanceRef: MutableRefObject<(() => Promise<void> | void) | null>;
  startDrag: (e: React.PointerEvent<HTMLDivElement>) => void;
  startResize: (
    dir: "e" | "s" | "se"
  ) => (e: React.PointerEvent<HTMLDivElement>) => void;
};

export function DJMiniPlayer({
  mountId,
  activeCard,
  containerStyle,
  containerClass,
  visible,
  isDocked,
  hostEl,
  manualPip,
  playing,
  toggle,
  stop,
  setManualPip,
  advanceRef,
  startDrag,
  startResize,
}: Props) {
  return (
    <div className={containerClass} style={containerStyle} aria-hidden={!visible}>
      {visible && (
        <>
          <div className="dj-mini-body">
            <div id={mountId} className="dj-mini-iframe" />
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
  );
}
