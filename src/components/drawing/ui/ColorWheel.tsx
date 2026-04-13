"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_PALETTE = [
  "#111111",
  "#ef4444",
  "#f59e0b",
  "#facc15",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ffffff",
];

const RECENT_KEY = "drawing-studio-recent-colors";

export function ColorWheel({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (hex: string) => void;
  onClose: () => void;
}) {
  const [recent, setRecent] = useState<string[]>([]);
  const [hexInput, setHexInput] = useState(value);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setHexInput(value);
  }, [value]);

  function pick(hex: string) {
    onChange(hex);
    try {
      const next = [hex, ...recent.filter((c) => c !== hex)].slice(0, 6);
      setRecent(next);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="ds-colorwheel">
      <div className="ds-colorwheel-head">
        <h3>색 선택</h3>
        <button
          type="button"
          onClick={onClose}
          className="ds-mini-btn"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      <NativeColorPicker value={value} onChange={pick} />

      {recent.length > 0 && (
        <>
          <div className="ds-colorwheel-label">최근</div>
          <div className="ds-colorwheel-swatches">
            {recent.map((c) => (
              <button
                key={c}
                type="button"
                className="ds-swatch"
                aria-label={`최근 색 ${c}`}
                style={{ background: c }}
                onClick={() => pick(c)}
              />
            ))}
          </div>
        </>
      )}

      <div className="ds-colorwheel-label">팔레트</div>
      <div className="ds-colorwheel-swatches">
        {DEFAULT_PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            className="ds-swatch"
            aria-label={`색 ${c}`}
            style={{ background: c }}
            onClick={() => pick(c)}
          />
        ))}
      </div>

      <div className="ds-colorwheel-label">Hex</div>
      <div className="ds-colorwheel-hex">
        <span>#</span>
        <input
          type="text"
          value={hexInput.replace(/^#/, "")}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
            setHexInput(`#${raw}`);
            if (raw.length === 6) pick(`#${raw}`);
          }}
          maxLength={6}
          className="ds-hex-input"
        />
      </div>
    </div>
  );
}

// A native <input type="color"> keeps the UI small but still lets students
// reach a full HSV wheel on every platform — iOS/Android / Chromium all
// provide a system colour picker here. A custom HSV wheel is deferred to v2.
function NativeColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <button
      type="button"
      className="ds-colorwheel-native"
      onClick={() => ref.current?.click()}
    >
      <span className="ds-colorwheel-preview" style={{ background: value }} />
      <span className="ds-colorwheel-native-label">색 팔레트 열기</span>
      <input
        ref={ref}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ds-colorwheel-native-input"
      />
    </button>
  );
}
