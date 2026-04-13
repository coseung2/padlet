"use client";

import type { BlendMode, Layer } from "../canvas/types";

const BLEND_LABEL: Record<BlendMode, string> = {
  normal: "일반",
  multiply: "곱하기",
  screen: "스크린",
  overlay: "오버레이",
};

export function LayerPanel({
  layers,
  activeLayerId,
  onSelect,
  onAdd,
  onDelete,
  onDuplicate,
  onToggleVisible,
  onReorder,
  onOpacityChange,
  onBlendChange,
}: {
  layers: Layer[];
  activeLayerId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onOpacityChange: (id: string, opacity: number) => void;
  onBlendChange: (id: string, mode: BlendMode) => void;
}) {
  const active = layers.find((l) => l.id === activeLayerId);

  // Render top-to-bottom visually (last layer in the stack is the top-most).
  const displayed = [...layers].reverse();

  return (
    <div className="ds-layer-panel">
      <div className="ds-layer-head">
        <span>레이어</span>
        <div className="ds-layer-head-actions">
          <button
            type="button"
            className="ds-mini-btn"
            onClick={onAdd}
            aria-label="레이어 추가"
            title="레이어 추가"
            disabled={layers.length >= 10}
          >
            +
          </button>
          <button
            type="button"
            className="ds-mini-btn"
            onClick={() => active && onDuplicate(active.id)}
            aria-label="레이어 복제"
            title="레이어 복제"
            disabled={!active || layers.length >= 10}
          >
            ⎘
          </button>
          <button
            type="button"
            className="ds-mini-btn ds-mini-btn-danger"
            onClick={() => active && onDelete(active.id)}
            aria-label="레이어 삭제"
            title="레이어 삭제"
            disabled={!active || layers.length <= 1}
          >
            🗑
          </button>
        </div>
      </div>

      <ul className="ds-layer-list" role="list">
        {displayed.map((layer, displayIdx) => {
          // Real index in the underlying (bottom-up) array.
          const realIdx = layers.length - 1 - displayIdx;
          const isActive = layer.id === activeLayerId;
          return (
            <li
              key={layer.id}
              className={`ds-layer-card ${isActive ? "is-active" : ""}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", String(realIdx));
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const from = Number(e.dataTransfer.getData("text/plain"));
                onReorder(from, realIdx);
              }}
            >
              <button
                type="button"
                className="ds-layer-visible"
                aria-pressed={layer.visible}
                aria-label={`${layer.name} 표시 여부`}
                title={layer.visible ? "표시 중" : "숨김"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisible(layer.id);
                }}
              >
                {layer.visible ? "👁" : "🚫"}
              </button>
              <button
                type="button"
                className="ds-layer-body"
                onClick={() => onSelect(layer.id)}
              >
                {layer.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={layer.thumbUrl}
                    alt=""
                    className="ds-layer-thumb"
                    loading="lazy"
                  />
                ) : (
                  <div className="ds-layer-thumb ds-layer-thumb-empty" />
                )}
                <span className="ds-layer-name">{layer.name}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {active && (
        <div className="ds-layer-settings">
          <label className="ds-slider-label">
            레이어 불투명
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(active.opacity * 100)}
              onChange={(e) =>
                onOpacityChange(active.id, Number(e.target.value) / 100)
              }
              className="ds-slider"
            />
            <span className="ds-slider-val">
              {Math.round(active.opacity * 100)}
            </span>
          </label>
          <label className="ds-field-label">
            블렌드 모드
            <select
              value={active.blendMode}
              onChange={(e) =>
                onBlendChange(active.id, e.target.value as BlendMode)
              }
              className="ds-select"
            >
              {(Object.keys(BLEND_LABEL) as BlendMode[]).map((m) => (
                <option key={m} value={m}>
                  {BLEND_LABEL[m]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
