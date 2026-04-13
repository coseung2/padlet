/**
 * Scanline flood fill — paint-bucket 구현. Stack-based iterative (재귀
 * 호출 깊이 초과 방지). 1200x1600 전체 = 1.92M 픽셀 처리 가능.
 */
import type { Rect } from "./types";

const TOLERANCE = 32; // 0..255, per-channel. 32 = 대부분의 "비슷한 색" 용인.

function distance(
  data: Uint8ClampedArray,
  idx: number,
  r: number,
  g: number,
  b: number,
  a: number
): number {
  const dr = data[idx] - r;
  const dg = data[idx + 1] - g;
  const db = data[idx + 2] - b;
  const da = data[idx + 3] - a;
  return Math.max(Math.abs(dr), Math.abs(dg), Math.abs(db), Math.abs(da));
}

function hexToRgba(hex: string): { r: number; g: number; b: number; a: number } {
  const clean = hex.startsWith("#") ? hex.slice(1) : hex;
  const n = parseInt(clean, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 255 };
}

/**
 * Fill the region connected to `(seedX, seedY)` on `canvas` with `fillHex`.
 * Returns the bounding box of the filled region so the history stack can
 * capture a minimal patch. No-op when the seed is already the fill colour.
 */
export function floodFill(
  canvas: HTMLCanvasElement,
  seedX: number,
  seedY: number,
  fillHex: string
): Rect | null {
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width;
  const h = canvas.height;
  if (seedX < 0 || seedY < 0 || seedX >= w || seedY >= h) return null;

  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;

  const seedIdx = (Math.floor(seedY) * w + Math.floor(seedX)) * 4;
  const target = {
    r: data[seedIdx],
    g: data[seedIdx + 1],
    b: data[seedIdx + 2],
    a: data[seedIdx + 3],
  };
  const fill = hexToRgba(fillHex);
  if (
    target.r === fill.r &&
    target.g === fill.g &&
    target.b === fill.b &&
    target.a === fill.a
  ) {
    return null;
  }

  // Scanline stack: each entry is a seed point, we fill the row it hits and
  // push rows above/below.
  const stack: Array<[number, number]> = [[Math.floor(seedX), Math.floor(seedY)]];
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;

  while (stack.length) {
    const [sx, sy] = stack.pop()!;
    if (sy < 0 || sy >= h) continue;

    // Expand left: walk until pixel no longer matches target (or we hit the
    // left edge). Record `left` as the first matching pixel in the row.
    let left = sx;
    while (left >= 0) {
      const idx = (sy * w + left) * 4;
      if (distance(data, idx, target.r, target.g, target.b, target.a) > TOLERANCE) break;
      left--;
    }
    left++;

    let right = sx;
    while (right < w) {
      const idx = (sy * w + right) * 4;
      if (distance(data, idx, target.r, target.g, target.b, target.a) > TOLERANCE) break;
      right++;
    }
    right--;

    if (left > right) continue;

    // Paint the span.
    for (let x = left; x <= right; x++) {
      const idx = (sy * w + x) * 4;
      data[idx] = fill.r;
      data[idx + 1] = fill.g;
      data[idx + 2] = fill.b;
      data[idx + 3] = fill.a;
    }
    if (left < minX) minX = left;
    if (right > maxX) maxX = right;
    if (sy < minY) minY = sy;
    if (sy > maxY) maxY = sy;

    // Seed rows above / below wherever the pixel still matches the target.
    for (const ny of [sy - 1, sy + 1]) {
      if (ny < 0 || ny >= h) continue;
      let inside = false;
      for (let x = left; x <= right; x++) {
        const idx = (ny * w + x) * 4;
        const matches =
          distance(data, idx, target.r, target.g, target.b, target.a) <= TOLERANCE;
        if (matches && !inside) {
          stack.push([x, ny]);
          inside = true;
        } else if (!matches) {
          inside = false;
        }
      }
    }
  }

  ctx.putImageData(img, 0, 0);
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
