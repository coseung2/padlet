/**
 * 레이어 스택 관리 + 합성.
 *
 * - 각 레이어는 offscreen HTMLCanvasElement(1200x1600).
 * - compose() 는 main canvas에 모든 visible layer 를 blend mode + opacity
 *   적용해 overlay. dirty rect 가 주어지면 그 부분만 재그림.
 * - 레이어 최대 10개. 첫 레이어는 항상 "배경" (흰색 fill 기본).
 */
import { BLEND_MAP, type Layer, type Rect } from "./types";

export const CANVAS_W = 1200;
export const CANVAS_H = 1600;
export const MAX_LAYERS = 10;

let nextId = 1;

function makeCanvas(w = CANVAS_W, h = CANVAS_H): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

export function createLayer(options?: { name?: string; fillWhite?: boolean }): Layer {
  const c = makeCanvas();
  if (options?.fillWhite) {
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
  return {
    id: `L${nextId++}`,
    name: options?.name ?? `레이어 ${nextId - 1}`,
    visible: true,
    opacity: 1,
    blendMode: "normal",
    canvas: c,
    thumbUrl: null,
  };
}

export function duplicateLayer(src: Layer): Layer {
  const c = makeCanvas();
  c.getContext("2d")!.drawImage(src.canvas, 0, 0);
  return {
    id: `L${nextId++}`,
    name: `${src.name} 복사`,
    visible: src.visible,
    opacity: src.opacity,
    blendMode: src.blendMode,
    canvas: c,
    thumbUrl: null,
  };
}

/**
 * Compose all layers onto target. When `rect` is supplied only that area is
 * cleared + redrawn, which is the common path during a stroke.
 */
export function compose(
  target: HTMLCanvasElement,
  layers: Layer[],
  rect?: Rect
): void {
  const ctx = target.getContext("2d");
  if (!ctx) return;

  if (rect) {
    // Clamp to canvas bounds.
    const x = Math.max(0, Math.floor(rect.x));
    const y = Math.max(0, Math.floor(rect.y));
    const w = Math.min(CANVAS_W - x, Math.ceil(rect.w));
    const h = Math.min(CANVAS_H - y, Math.ceil(rect.h));
    if (w <= 0 || h <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.clearRect(x, y, w, h);
    for (const layer of layers) {
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = BLEND_MAP[layer.blendMode];
      ctx.drawImage(layer.canvas, x, y, w, h, x, y, w, h);
    }
    ctx.restore();
    return;
  }

  ctx.clearRect(0, 0, target.width, target.height);
  for (const layer of layers) {
    if (!layer.visible) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = BLEND_MAP[layer.blendMode];
    ctx.drawImage(layer.canvas, 0, 0);
    ctx.restore();
  }
}

/**
 * Flatten visible layers into a new offscreen canvas. Used at save time to
 * produce the PNG that gets uploaded to /api/student-assets.
 */
export function flatten(layers: Layer[]): HTMLCanvasElement {
  const out = makeCanvas();
  const ctx = out.getContext("2d")!;
  // Save path treats invisible layers as unrendered. We DO NOT fill a
  // background colour here — the bottom layer (usually "배경") already
  // owns the white paint so flatten matches the on-screen composite.
  for (const layer of layers) {
    if (!layer.visible) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = BLEND_MAP[layer.blendMode];
    ctx.drawImage(layer.canvas, 0, 0);
    ctx.restore();
  }
  return out;
}

/**
 * Generate a 40x40 thumbnail of a single layer for the panel. The panel
 * calls this at most ~1/sec while the layer is dirty.
 */
export function generateThumb(layer: Layer): string {
  const t = makeCanvas(40, 40);
  t.getContext("2d")!.drawImage(layer.canvas, 0, 0, 40, 40);
  return t.toDataURL("image/png");
}

export function initialStack(): Layer[] {
  // "배경" layer holds the white paint so erasing the top layer reveals
  // white (not transparent) in the default flow. Users can delete the
  // background or toggle its visibility if they want transparent export,
  // but MVP keeps the mental model simple.
  const bg = createLayer({ name: "배경", fillWhite: true });
  const work = createLayer({ name: "레이어 1" });
  return [bg, work];
}
