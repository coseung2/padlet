"use client";

/**
 * 최상단 얇은 바 (36px). Ibis 처럼 대부분의 컨트롤은 하단/우측으로
 * 이동했고, 저장 / 펜-only 토글 / fit / zoom% 표시만 남았다.
 */
export function TopBar({
  zoom,
  penOnly,
  onSave,
  onFit,
  onPenOnlyToggle,
}: {
  zoom: number;
  penOnly: boolean;
  onSave: () => void;
  onFit: () => void;
  onPenOnlyToggle: () => void;
}) {
  return (
    <div className="ds-topbar">
      <div className="ds-topbar-spacer" />
      <div className="ds-topbar-group">
        <button
          type="button"
          className={`ds-topbar-btn ${penOnly ? "is-active" : ""}`}
          aria-pressed={penOnly}
          onClick={onPenOnlyToggle}
          title={penOnly ? "펜만 허용 (손바닥 무시)" : "펜/터치/마우스 허용"}
        >
          {penOnly ? "🖊 펜만" : "👆 모두"}
        </button>
        <button
          type="button"
          className="ds-topbar-btn"
          onClick={onFit}
          title="화면에 맞추기 (0)"
          aria-label="화면에 맞추기"
        >
          ⤢
        </button>
        <span className="ds-zoom-indicator" aria-live="polite">
          {Math.round(zoom * 100)}%
        </span>
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
