/**
 * 브러시 프리셋 6종 — 연필/펜/마커/에어브러시/수채/크레용.
 *
 * 동일한 `StrokeEngine` 이 사용하지만 profile.render 구현만 다르다. 각
 * 프리셋은 "도구 특성"을 캔버스에 찍는 한 번의 sample 단위 렌더 책임을
 * 지며, 샘플 간 연속 처리(라인 연결 / stipple 배치)도 profile 내부에서
 * 처리한다. 입력으로 최근 N 샘플을 받아 마지막 두 샘플 사이만 그리는
 * incremental 패턴 — 전체 stroke 를 매번 다시 그리지 않는다.
 */
import type { StrokeSample } from "./types";

export type BrushId =
  | "pencil"
  | "pen"
  | "marker"
  | "airbrush"
  | "watercolor"
  | "crayon";

export interface BrushState {
  color: string;  // hex #rrggbb
  size: number;   // px
  opacity: number; // 0..1
}

export interface BrushProfile {
  id: BrushId;
  label: string;
  icon: string;
  /**
   * Paint the last segment (from `prev` to `curr`) of the stroke into `ctx`.
   * Returns the bounding rect affected so the compositor can mark the
   * layer dirty. No-op when `prev == null` (just a tap).
   */
  drawSegment(
    ctx: CanvasRenderingContext2D,
    prev: StrokeSample | null,
    curr: StrokeSample,
    state: BrushState
  ): Rect;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ─── helpers ─────────────────────────────────────────────────

function pressureFactor(p: number): number {
  // Non-pressure sources (mouse / passive touch) report 0 — treat as 0.5
  // so the stroke has visible thickness.
  if (!p || p === 0) return 0.5;
  return Math.min(1, Math.max(0.1, p));
}

function bboxFromPoints(
  a: StrokeSample | null,
  b: StrokeSample,
  pad: number
): Rect {
  const xs = a ? [a.x, b.x] : [b.x];
  const ys = a ? [a.y, b.y] : [b.y];
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const maxX = Math.max(...xs) + pad;
  const maxY = Math.max(...ys) + pad;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.startsWith("#") ? hex.slice(1) : hex;
  const n = parseInt(clean, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgba(color: string, alpha: number) {
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── presets ─────────────────────────────────────────────────

const pencil: BrushProfile = {
  id: "pencil",
  label: "연필",
  icon: "✏️",
  drawSegment(ctx, prev, curr, state) {
    const pf = pressureFactor(curr.pressure);
    const width = Math.max(1, state.size * pf * 0.6);
    const alpha = state.opacity * (0.4 + pf * 0.5);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = rgba(state.color, alpha);
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (prev) {
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(curr.x, curr.y, width / 2, 0, Math.PI * 2);
      ctx.fillStyle = rgba(state.color, alpha);
      ctx.fill();
    }
    ctx.restore();
    return bboxFromPoints(prev, curr, width + 2);
  },
};

const pen: BrushProfile = {
  id: "pen",
  label: "펜",
  icon: "🖋",
  drawSegment(ctx, prev, curr, state) {
    const width = Math.max(1, state.size * 0.7);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = rgba(state.color, state.opacity);
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (prev) {
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(curr.x, curr.y, width / 2, 0, Math.PI * 2);
      ctx.fillStyle = rgba(state.color, state.opacity);
      ctx.fill();
    }
    ctx.restore();
    return bboxFromPoints(prev, curr, width + 2);
  },
};

const marker: BrushProfile = {
  id: "marker",
  label: "마커",
  icon: "🖍",
  drawSegment(ctx, prev, curr, state) {
    const pf = pressureFactor(curr.pressure);
    const width = Math.max(2, state.size * (0.9 + pf * 0.2));
    // Marker feels "wide + translucent" — fixed low alpha, strokes add up.
    const alpha = Math.min(0.9, state.opacity * 0.5);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = rgba(state.color, alpha);
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (prev) {
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(curr.x, curr.y, width / 2, 0, Math.PI * 2);
      ctx.fillStyle = rgba(state.color, alpha);
      ctx.fill();
    }
    ctx.restore();
    return bboxFromPoints(prev, curr, width + 4);
  },
};

const airbrush: BrushProfile = {
  id: "airbrush",
  label: "에어브러시",
  icon: "💨",
  drawSegment(ctx, prev, curr, state) {
    const pf = pressureFactor(curr.pressure);
    const radius = Math.max(6, state.size * 1.2);
    // Scatter 20 dots per segment along the line for smooth spray.
    const samples = prev
      ? Math.max(3, Math.round(Math.hypot(curr.x - prev.x, curr.y - prev.y) / 2))
      : 1;
    const tx = curr.tiltX ?? 0;
    const ty = curr.tiltY ?? 0;
    const offsetScale = 0.06;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    for (let i = 0; i < samples; i++) {
      const t = prev ? i / samples : 0;
      const px = prev ? prev.x + (curr.x - prev.x) * t : curr.x;
      const py = prev ? prev.y + (curr.y - prev.y) * t : curr.y;
      // Radial gradient centered on sample — alpha tapers to 0 at edge.
      const cx = px + tx * offsetScale * radius;
      const cy = py + ty * offsetScale * radius;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      const alpha = state.opacity * pf * 0.15;
      grad.addColorStop(0, rgba(state.color, alpha));
      grad.addColorStop(1, rgba(state.color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return bboxFromPoints(prev, curr, radius + 4);
  },
};

const watercolor: BrushProfile = {
  id: "watercolor",
  label: "수채",
  icon: "💧",
  drawSegment(ctx, prev, curr, state) {
    const pf = pressureFactor(curr.pressure);
    const width = Math.max(4, state.size * (0.8 + pf * 0.4));
    // Very low base opacity + repeated inner/outer stamps = "wash" feel.
    const layers = [
      { w: width * 1.2, a: state.opacity * 0.08 },
      { w: width * 0.9, a: state.opacity * 0.15 },
      { w: width * 0.5, a: state.opacity * 0.25 },
    ];
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const layer of layers) {
      ctx.strokeStyle = rgba(state.color, layer.a);
      ctx.lineWidth = layer.w;
      if (prev) {
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(curr.x, curr.y, layer.w / 2, 0, Math.PI * 2);
        ctx.fillStyle = rgba(state.color, layer.a);
        ctx.fill();
      }
    }
    ctx.restore();
    return bboxFromPoints(prev, curr, width * 1.2 + 4);
  },
};

const crayon: BrushProfile = {
  id: "crayon",
  label: "크레용",
  icon: "🖌",
  drawSegment(ctx, prev, curr, state) {
    const pf = pressureFactor(curr.pressure);
    const width = Math.max(2, state.size * (0.7 + pf * 0.6));
    const samples = prev
      ? Math.max(2, Math.round(Math.hypot(curr.x - prev.x, curr.y - prev.y) / 1.5))
      : 1;
    const density = 5 + Math.round(pf * 15);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    for (let i = 0; i < samples; i++) {
      const t = prev ? i / samples : 0;
      const px = prev ? prev.x + (curr.x - prev.x) * t : curr.x;
      const py = prev ? prev.y + (curr.y - prev.y) * t : curr.y;
      for (let d = 0; d < density; d++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * width * 0.55;
        const dotSize = Math.max(0.5, width * 0.12 * Math.random());
        const alpha = state.opacity * (0.4 + Math.random() * 0.5);
        ctx.fillStyle = rgba(state.color, alpha);
        ctx.beginPath();
        ctx.arc(
          px + Math.cos(angle) * dist,
          py + Math.sin(angle) * dist,
          dotSize,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
    ctx.restore();
    return bboxFromPoints(prev, curr, width + 4);
  },
};

// ─── eraser (not a brush preset but shares signature) ───────

export const eraserProfile: BrushProfile = {
  id: "pencil", // placeholder — the stroke engine keys on tool, not brush id
  label: "지우개",
  icon: "🧽",
  drawSegment(ctx, prev, curr, state) {
    const pf = pressureFactor(curr.pressure);
    const width = Math.max(2, state.size * (0.7 + pf * 0.6));
    ctx.save();
    // destination-out removes pixels, leaving transparent under the stroke
    // so lower layers peek through — NOT filled with white.
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (prev) {
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(curr.x, curr.y, width / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return bboxFromPoints(prev, curr, width + 2);
  },
};

export const BRUSH_PRESETS: BrushProfile[] = [
  pencil,
  pen,
  marker,
  airbrush,
  watercolor,
  crayon,
];

export function getBrush(id: BrushId): BrushProfile {
  return BRUSH_PRESETS.find((p) => p.id === id) ?? pencil;
}
