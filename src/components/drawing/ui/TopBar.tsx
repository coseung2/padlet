"use client";

export function TopBar({
  canUndo,
  canRedo,
  size,
  opacity,
  penOnly,
  onUndo,
  onRedo,
  onClear,
  onSave,
  onSizeChange,
  onOpacityChange,
  onPenOnlyToggle,
}: {
  canUndo: boolean;
  canRedo: boolean;
  size: number;
  opacity: number;
  penOnly: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onSave: () => void;
  onSizeChange: (n: number) => void;
  onOpacityChange: (n: number) => void;
  onPenOnlyToggle: () => void;
}) {
  return (
    <div className="ds-topbar">
      <div className="ds-topbar-group">
        <button
          type="button"
          className="ds-topbar-btn"
          disabled={!canUndo}
          onClick={onUndo}
          aria-label="되돌리기"
          title="되돌리기 (Ctrl+Z)"
        >
          ⟲
        </button>
        <button
          type="button"
          className="ds-topbar-btn"
          disabled={!canRedo}
          onClick={onRedo}
          aria-label="다시"
          title="다시 (Ctrl+Y)"
        >
          ⟳
        </button>
        <button
          type="button"
          className="ds-topbar-btn"
          onClick={onClear}
          aria-label="현재 레이어 지우기"
          title="현재 레이어 지우기"
        >
          ✕
        </button>
      </div>
      <div className="ds-topbar-group ds-topbar-slider-group">
        <label className="ds-slider-label">
          굵기
          <input
            type="range"
            min={1}
            max={120}
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            className="ds-slider"
          />
          <span className="ds-slider-val">{size}</span>
        </label>
        <label className="ds-slider-label">
          불투명
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(opacity * 100)}
            onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
            className="ds-slider"
          />
          <span className="ds-slider-val">{Math.round(opacity * 100)}</span>
        </label>
      </div>
      <div className="ds-topbar-group">
        <button
          type="button"
          className={`ds-topbar-btn ${penOnly ? "is-active" : ""}`}
          onClick={onPenOnlyToggle}
          aria-pressed={penOnly}
          title={penOnly ? "펜만 — 손바닥 무시" : "펜/터치/마우스 모두 허용"}
        >
          {penOnly ? "🖊 펜만" : "👆 모두"}
        </button>
        <button
          type="button"
          className="ds-topbar-btn ds-save-btn"
          onClick={onSave}
          title="저장"
        >
          💾 저장
        </button>
      </div>
    </div>
  );
}
