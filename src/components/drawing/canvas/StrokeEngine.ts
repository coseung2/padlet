/**
 * Stroke engine — PointerEvent → StrokeSample[] → layer canvas.
 *
 * 책임:
 *   - 현재 도구의 BrushProfile 또는 eraser 를 선택해 segment 단위 draw.
 *   - stroke 시작 전 레이어의 영향 bbox 를 캡처해 HistoryStack 에 push
 *     할 patch 를 구성 (before/after).
 *   - stroke 전체를 관통하는 상태를 보관 (lastSample, dirtyRect accum).
 */
import { BRUSH_PRESETS, eraserProfile, type BrushState, getBrush } from "./BrushPresets";
import { capturePatch, type HistoryEntry } from "./HistoryStack";
import type { Layer, Rect, StrokeSample, Tool } from "./types";

export interface StrokeSession {
  layer: Layer;
  tool: Tool;
  state: BrushState;
  lastSample: StrokeSample | null;
  dirtyRect: Rect | null;
  beforeSnapshot: ReturnType<typeof capturePatch> | null;
}

function unionRect(a: Rect | null, b: Rect): Rect {
  if (!a) return b;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.w, b.x + b.w);
  const bottom = Math.max(a.y + a.h, b.y + b.h);
  return { x, y, w: right - x, h: bottom - y };
}

/**
 * Start a stroke on `layer`. We pre-capture a generous padding rect based on
 * the first sample — if the user drags outside, we union the rect on each
 * segment. At stroke end the engine produces a HistoryEntry.
 */
export function beginStroke(
  layer: Layer,
  tool: Tool,
  state: BrushState,
  first: StrokeSample
): StrokeSession {
  // Rough initial bbox: 3x brush size padding. Expanded on drawSegment.
  const pad = Math.max(16, state.size * 2);
  const initRect: Rect = {
    x: first.x - pad,
    y: first.y - pad,
    w: pad * 2,
    h: pad * 2,
  };
  const before = capturePatch(layer.canvas, {
    x: 0,
    y: 0,
    w: layer.canvas.width,
    h: layer.canvas.height,
  });

  const session: StrokeSession = {
    layer,
    tool,
    state,
    lastSample: null,
    dirtyRect: initRect,
    beforeSnapshot: before,
  };
  drawSegment(session, first);
  return session;
}

export function drawSegment(session: StrokeSession, curr: StrokeSample): void {
  const ctx = session.layer.canvas.getContext("2d");
  if (!ctx) return;
  const profile =
    session.tool === "eraser" ? eraserProfile : getBrush(session.tool as never);
  const rect = profile.drawSegment(ctx, session.lastSample, curr, session.state);
  session.dirtyRect = unionRect(session.dirtyRect, rect);
  session.lastSample = curr;
}

export function endStroke(session: StrokeSession): HistoryEntry | null {
  if (!session.dirtyRect || !session.beforeSnapshot) return null;

  // Capture 'after' constrained to the same rect the before was captured on.
  // beforeSnapshot already covers full layer (worst case) so we can pull
  // the exact same rect for after.
  const afterCtx = session.layer.canvas.getContext("2d");
  if (!afterCtx) return null;
  const { rect: beforeRect, data: beforeData, isFullLayer } = session.beforeSnapshot;
  const after = afterCtx.getImageData(
    beforeRect.x,
    beforeRect.y,
    beforeRect.w,
    beforeRect.h
  );

  return {
    layerId: session.layer.id,
    rect: beforeRect,
    before: beforeData,
    after,
    isFullLayer,
  };
}

export { BRUSH_PRESETS };
