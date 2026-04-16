/**
 * Undo/Redo 스택 — stroke 단위로 레이어의 bbox 변경 이전/이후 픽셀만
 * 보관해 메모리 footprint 를 작게 유지. 평균 200x200 patch × 50 step ≈
 * 8MB 수준. 단일 patch가 2MB 를 넘어서면 해당 스텝은 전체 레이어 snapshot
 * 으로 저장한다 (`isFullLayer=true`).
 */
import type { Rect } from "./types";

const CAP = 50;
const SINGLE_PATCH_BYTE_LIMIT = 2 * 1024 * 1024; // 2MB

export interface HistoryEntry {
  layerId: string;
  rect: Rect;
  before: ImageData;
  after: ImageData;
  isFullLayer: boolean;
}

export class HistoryStack {
  private entries: HistoryEntry[] = [];
  private index = -1; // index of last applied action

  push(entry: HistoryEntry): void {
    // Drop any redoable entries — a new action from a past state branches
    // the timeline and we don't keep alternative futures.
    this.entries = this.entries.slice(0, this.index + 1);
    this.entries.push(entry);
    if (this.entries.length > CAP) {
      this.entries.shift();
    }
    this.index = this.entries.length - 1;
  }

  canUndo(): boolean {
    return this.index >= 0;
  }

  canRedo(): boolean {
    return this.index < this.entries.length - 1;
  }

  undo(): HistoryEntry | null {
    if (!this.canUndo()) return null;
    const entry = this.entries[this.index];
    this.index -= 1;
    return entry;
  }

  redo(): HistoryEntry | null {
    if (!this.canRedo()) return null;
    this.index += 1;
    return this.entries[this.index];
  }

  clear(): void {
    this.entries = [];
    this.index = -1;
  }
}

/**
 * Capture the bbox area's ImageData from the layer canvas. Returns null when
 * the rect is completely outside the canvas or of zero size.
 */
export function capturePatch(
  canvas: HTMLCanvasElement,
  rect: Rect
): { data: ImageData; rect: Rect; isFullLayer: boolean } | null {
  const x = Math.max(0, Math.floor(rect.x));
  const y = Math.max(0, Math.floor(rect.y));
  const w = Math.min(canvas.width - x, Math.ceil(rect.w));
  const h = Math.min(canvas.height - y, Math.ceil(rect.h));
  if (w <= 0 || h <= 0) return null;

  const ctx = canvas.getContext("2d")!;
  const bytes = w * h * 4;
  if (bytes > SINGLE_PATCH_BYTE_LIMIT) {
    // Promote to full-layer snapshot.
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return {
      data,
      rect: { x: 0, y: 0, w: canvas.width, h: canvas.height },
      isFullLayer: true,
    };
  }

  return {
    data: ctx.getImageData(x, y, w, h),
    rect: { x, y, w, h },
    isFullLayer: false,
  };
}

/**
 * Write the given ImageData patch back to the layer canvas at the rect's
 * origin. Used by both undo and redo (they swap before/after).
 */
export function applyPatch(
  canvas: HTMLCanvasElement,
  patch: ImageData,
  rect: Rect
): void {
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(patch, rect.x, rect.y);
}
