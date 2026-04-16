"use client";

/**
 * 우측 세로 레일 — 굵기 / 불투명 / 보정 슬라이더 + 레이어 토글.
 *
 * native `<input type="range">` 에 orient/writing-mode 조합으로 세로
 * 모드. CSS 에서 `-webkit-appearance: slider-vertical` 과
 * `appearance: slider-vertical` 둘 다 지정해 Chrome/Safari/Firefox
 * 모두 커버.
 */
export function RightRail({
  size,
  opacity,
  stabilizer,
  layerSheetOpen,
  onSizeChange,
  onOpacityChange,
  onStabilizerChange,
  onLayerToggle,
}: {
  size: number;
  opacity: number;
  stabilizer: number;
  layerSheetOpen: boolean;
  onSizeChange: (n: number) => void;
  onOpacityChange: (n: number) => void;
  onStabilizerChange: (n: number) => void;
  onLayerToggle: () => void;
}) {
  return (
    <aside className="ds-right-rail" aria-label="브러시 설정">
      <Vslider
        label="굵기"
        min={1}
        max={120}
        value={size}
        onChange={onSizeChange}
      />
      <Vslider
        label="투명"
        min={0}
        max={100}
        value={Math.round(opacity * 100)}
        onChange={(n) => onOpacityChange(n / 100)}
      />
      <Vslider
        label="보정"
        min={0}
        max={10}
        value={stabilizer}
        onChange={onStabilizerChange}
      />
      <button
        type="button"
        className={`ds-rail-layer-btn ${layerSheetOpen ? "is-active" : ""}`}
        aria-pressed={layerSheetOpen}
        aria-label="레이어 패널"
        title="레이어 (L)"
        onClick={onLayerToggle}
      >
        📁
      </button>
    </aside>
  );
}

function Vslider({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="ds-vslider">
      <span className="ds-vslider-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ds-vslider-input"
        // @ts-expect-error — non-standard attribute kept for Firefox support
        orient="vertical"
        aria-label={label}
      />
      <span className="ds-vslider-val">{value}</span>
    </label>
  );
}
