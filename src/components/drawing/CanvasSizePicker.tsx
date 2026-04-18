"use client";

import type { CanvasSize } from "./canvas/LayerStack";

// Preset list — seeds informed by: (1) Korean A4 portrait common in
// printouts, (2) HD landscape for board cards, (3) square for social
// posts, (4) tall canvas for long-form webtoon-style practice. Values are
// pixel dimensions at roughly 150 DPI for A4 (same spirit as the previous
// 1200×1600 default, which was A4-ish portrait).
export const CANVAS_PRESETS: ReadonlyArray<{
  id: string;
  label: string;
  desc: string;
  size: CanvasSize;
}> = [
  {
    id: "a4-portrait",
    label: "A4 세로",
    desc: "인쇄용 기본 (1200×1600)",
    size: { w: 1200, h: 1600 },
  },
  {
    id: "a4-landscape",
    label: "A4 가로",
    desc: "가로 인쇄 (1600×1200)",
    size: { w: 1600, h: 1200 },
  },
  {
    id: "square",
    label: "정사각형",
    desc: "게시판 카드용 (1200×1200)",
    size: { w: 1200, h: 1200 },
  },
  {
    id: "hd-landscape",
    label: "HD 가로",
    desc: "슬라이드/발표 (1920×1080)",
    size: { w: 1920, h: 1080 },
  },
  {
    id: "webtoon",
    label: "세로 길게",
    desc: "만화 연습 (900×2000)",
    size: { w: 900, h: 2000 },
  },
];

type Props = {
  onPick: (size: CanvasSize) => void;
  onClose?: () => void;
};

export function CanvasSizePicker({ onPick, onClose }: Props) {
  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="add-card-modal create-board-modal canvas-size-picker">
        <div className="modal-header">
          <h2 className="modal-title">캔버스 크기 선택</h2>
          {onClose && (
            <button type="button" className="modal-close" onClick={onClose}>
              ×
            </button>
          )}
        </div>
        <div className="modal-body">
          <p className="create-board-hint">
            그림을 시작할 캔버스 크기를 골라 주세요. 나중에 크기를 바꾸려면
            새로 시작해야 합니다.
          </p>
          <div className="layout-picker">
            {CANVAS_PRESETS.map((p) => {
              const ratio = p.size.w / p.size.h;
              // Rendered preview rectangle — keeps aspect ratio so the
              // teacher/student sees landscape vs portrait at a glance.
              const maxEdge = 60;
              const previewW = ratio >= 1 ? maxEdge : Math.round(maxEdge * ratio);
              const previewH = ratio >= 1 ? Math.round(maxEdge / ratio) : maxEdge;
              return (
                <button
                  key={p.id}
                  type="button"
                  className="layout-option"
                  onClick={() => onPick(p.size)}
                >
                  <span
                    className="canvas-size-preview"
                    style={{
                      width: previewW,
                      height: previewH,
                      background: "var(--color-surface-alt)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 4,
                      display: "inline-block",
                    }}
                    aria-hidden="true"
                  />
                  <span className="layout-option-label">{p.label}</span>
                  <span className="layout-option-desc">{p.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
