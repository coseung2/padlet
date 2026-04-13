"use client";

/**
 * HSV Color Picker (Ibis style).
 *
 * 전면 모달 — Hue 링 + SV 사각형 + Hex 입력 + 최근 + 팔레트.
 *
 *   ┌─ backdrop ─┐
 *   │  ┌── card ─┐
 *   │  │  title  │
 *   │  │  Hue ring + SV square (single <canvas>)
 *   │  │  preview | Hex input
 *   │  │  recent swatches
 *   │  │  palette swatches
 *   │  └─────────┘
 *   └────────────┘
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const SIZE = 240;
const RING_THICKNESS = 22;
const RING_OUTER = SIZE / 2 - 4;
const RING_INNER = RING_OUTER - RING_THICKNESS;
const SV_RADIUS = RING_INNER - 10;
const SV_SIDE = SV_RADIUS * Math.SQRT2;

const PALETTE = [
  "#000000", "#424242", "#9e9e9e", "#ffffff",
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
  "#7c2d12", "#78350f", "#166534", "#1e3a8a",
];

const RECENT_KEY = "drawing-studio-recent-colors";

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hh < 1) [r, g, b] = [c, x, 0];
  else if (hh < 2) [r, g, b] = [x, c, 0];
  else if (hh < 3) [r, g, b] = [0, c, x];
  else if (hh < 4) [r, g, b] = [0, x, c];
  else if (hh < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round((n + m) * 255)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function HSVWheel({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (hex: string) => void;
  onClose: () => void;
}) {
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [recent, setRecent] = useState<string[]>([]);
  const [hexInput, setHexInput] = useState(value.replace("#", ""));
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load / sync external value.
  useEffect(() => {
    setHsv(hexToHsv(value));
    setHexInput(value.replace("#", ""));
  }, [value]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  // Paint Hue ring + SV square. Recomputes when Hue changes.
  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);

    const cx = SIZE / 2;
    const cy = SIZE / 2;

    // Hue ring — 360 arcs, 1deg each (slight overlap to avoid seams).
    for (let a = 0; a < 360; a += 1) {
      const start = ((a - 0.6) * Math.PI) / 180;
      const end = ((a + 0.6) * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(cx, cy, RING_OUTER, start, end);
      ctx.arc(cx, cy, RING_INNER, end, start, true);
      ctx.closePath();
      ctx.fillStyle = `hsl(${a}, 100%, 50%)`;
      ctx.fill();
    }

    // SV square — draw as 1-px gradient strips (vertical sweep per column).
    // Saturation left→right, Value top→bottom inverted.
    const sqX = cx - SV_SIDE / 2;
    const sqY = cy - SV_SIDE / 2;
    const steps = 48;
    const step = SV_SIDE / steps;
    for (let i = 0; i < steps; i++) {
      const s = i / (steps - 1);
      const x = sqX + i * step;
      const grad = ctx.createLinearGradient(x, sqY, x, sqY + SV_SIDE);
      for (let j = 0; j <= 8; j++) {
        const v = 1 - j / 8;
        grad.addColorStop(j / 8, hsvToHex(hsv.h, s, v));
      }
      ctx.fillStyle = grad;
      ctx.fillRect(x, sqY, step + 0.5, SV_SIDE);
    }

    // Ring selector.
    const ringRad = (RING_OUTER + RING_INNER) / 2;
    const hueRad = (hsv.h * Math.PI) / 180;
    const hx = cx + Math.cos(hueRad) * ringRad;
    const hy = cy + Math.sin(hueRad) * ringRad;
    ctx.beginPath();
    ctx.arc(hx, hy, 7, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.stroke();

    // SV selector.
    const sx = sqX + hsv.s * SV_SIDE;
    const sy = sqY + (1 - hsv.v) * SV_SIDE;
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [hsv]);

  useEffect(() => {
    paint();
  }, [paint]);

  const currentHex = useMemo(() => hsvToHex(hsv.h, hsv.s, hsv.v), [hsv]);

  const commit = useCallback(
    (hex: string) => {
      onChange(hex);
      try {
        const next = [hex, ...recent.filter((c) => c !== hex)].slice(0, 12);
        setRecent(next);
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [onChange, recent]
  );

  const handleDrag = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = SIZE / rect.width;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy);

    if (dist >= RING_INNER - 4 && dist <= RING_OUTER + 4) {
      let h = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (h < 0) h += 360;
      setHsv((prev) => ({ ...prev, h }));
      return;
    }
    const sqX = cx - SV_SIDE / 2;
    const sqY = cy - SV_SIDE / 2;
    if (x >= sqX && x <= sqX + SV_SIDE && y >= sqY && y <= sqY + SV_SIDE) {
      const s = Math.max(0, Math.min(1, (x - sqX) / SV_SIDE));
      const v = Math.max(0, Math.min(1, 1 - (y - sqY) / SV_SIDE));
      setHsv((prev) => ({ ...prev, s, v }));
    }
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    handleDrag(e);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    handleDrag(e);
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    commit(currentHex);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="ds-hsv-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="색상 선택"
      onClick={onClose}
    >
      <div className="ds-hsv-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ds-hsv-head">
          <span>색상 선택</span>
          <button
            type="button"
            className="ds-mini-btn"
            aria-label="닫기"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="ds-hsv-canvas"
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />

        <div className="ds-hsv-preview-row">
          <span
            className="ds-hsv-preview"
            style={{ background: currentHex }}
            aria-label={`미리보기 ${currentHex}`}
          />
          <div className="ds-hsv-hex-row">
            <span>#</span>
            <input
              type="text"
              value={hexInput}
              onChange={(e) => {
                const raw = e.target.value
                  .replace(/[^0-9a-fA-F]/g, "")
                  .slice(0, 6);
                setHexInput(raw);
                if (raw.length === 6) {
                  const next = `#${raw}`;
                  setHsv(hexToHsv(next));
                  commit(next);
                }
              }}
              maxLength={6}
              className="ds-hex-input"
            />
          </div>
        </div>

        {recent.length > 0 && (
          <>
            <div className="ds-hsv-label">최근</div>
            <div className="ds-swatch-grid">
              {recent.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="ds-swatch"
                  style={{ background: c }}
                  aria-label={`최근 색 ${c}`}
                  onClick={() => {
                    setHsv(hexToHsv(c));
                    commit(c);
                  }}
                />
              ))}
            </div>
          </>
        )}

        <div className="ds-hsv-label">팔레트</div>
        <div className="ds-swatch-grid">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              className="ds-swatch"
              style={{ background: c }}
              aria-label={`색 ${c}`}
              onClick={() => {
                setHsv(hexToHsv(c));
                commit(c);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
