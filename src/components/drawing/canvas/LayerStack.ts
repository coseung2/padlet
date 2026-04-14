/**
 * 레이어 스택 관리 + 합성.
 *
 * - 각 레이어는 offscreen HTMLCanvasElement(기본 1200x1600, 사이즈 선택 시
 *   프리셋).
 * - compose() 는 main canvas에 모든 visible layer 를 blend mode + opacity
 *   적용해 overlay. dirty rect 가 주어지면 그 부분만 재그림.
 * - 레이어 최대 10개. 첫 레이어는 항상 "배경" (흰색 fill 기본).
 */
import { BLEND_MAP, type Layer, type Rect } from "./types";

// 기본 크기 (하위 호환). 런타임에 size 를 명시하면 그 크기로 레이어가
// 만들어진다 — DrawingStudio 초기 진입 시 CanvasSizePicker 로 선택.
export const CANVAS_W = 1200;
export const CANVAS_H = 1600;
export const MAX_LAYERS = 10;

export type CanvasSize = { w: number; h: number };

let nextId = 1;

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

export function createLayer(options?: {
  name?: string;
  fillWhite?: boolean;
  size?: CanvasSize;
}): Layer {
  const size = options?.size ?? { w: CANVAS_W, h: CANVAS_H };
  const c = makeCanvas(size.w, size.h);
  if (options?.fillWhite) {
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size.w, size.h);
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
  const c = makeCanvas(src.canvas.width, src.canvas.height);
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
    const x = Math.max(0, Math.floor(rect.x));
    const y = Math.max(0, Math.floor(rect.y));
    const w = Math.min(target.width - x, Math.ceil(rect.w));
    const h = Math.min(target.height - y, Math.ceil(rect.h));
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
export function flatten(layers: Layer[], size?: CanvasSize): HTMLCanvasElement {
  // 사이즈는 첫 레이어 캔버스 기준(모든 레이어는 같은 크기를 공유한다는
  // 내부 불변량). 명시 size 가 있으면 그것을 우선.
  const w = size?.w ?? layers[0]?.canvas.width ?? CANVAS_W;
  const h = size?.h ?? layers[0]?.canvas.height ?? CANVAS_H;
  const out = makeCanvas(w, h);
  const ctx = out.getContext("2d")!;
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
 * Generate a 40x40 thumbnail of a single layer for the panel.
 */
export function generateThumb(layer: Layer): string {
  const t = makeCanvas(40, 40);
  t.getContext("2d")!.drawImage(layer.canvas, 0, 0, 40, 40);
  return t.toDataURL("image/png");
}

export function initialStack(size?: CanvasSize): Layer[] {
  const bg = createLayer({ name: "배경", fillWhite: true, size });
  const work = createLayer({ name: "레이어 1", size });
  return [bg, work];
}
