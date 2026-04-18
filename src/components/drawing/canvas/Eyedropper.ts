/**
 * Eyedropper — sample the composite pixel at (x, y).
 *
 * 합성 결과(모든 visible 레이어 overlay 후)의 픽셀을 읽어야 사용자가
 * 보고 있는 색과 일치. 따라서 main (composited) canvas 에서 sample 한다.
 */

export function sampleHex(
  compositeCanvas: HTMLCanvasElement,
  x: number,
  y: number
): string | null {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  if (cx < 0 || cy < 0 || cx >= compositeCanvas.width || cy >= compositeCanvas.height) {
    return null;
  }
  const ctx = compositeCanvas.getContext("2d");
  if (!ctx) return null;
  const { data } = ctx.getImageData(cx, cy, 1, 1);
  const [r, g, b, a] = Array.from(data);
  if (a === 0) return null; // transparent — leave current colour alone
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
