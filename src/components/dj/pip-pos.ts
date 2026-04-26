export type PipPos = { x: number; y: number; w: number; h: number };

const PIP_STORAGE_KEY = "djPipPos";
export const DEFAULT_PIP: PipPos = { x: -1, y: -1, w: 360, h: 260 };
export const MIN_W = 240;
export const MIN_H = 180;

export function loadPipPos(): PipPos {
  if (typeof window === "undefined") return DEFAULT_PIP;
  try {
    const raw = localStorage.getItem(PIP_STORAGE_KEY);
    if (!raw) return DEFAULT_PIP;
    const parsed = JSON.parse(raw) as Partial<PipPos>;
    return {
      x: typeof parsed.x === "number" ? parsed.x : DEFAULT_PIP.x,
      y: typeof parsed.y === "number" ? parsed.y : DEFAULT_PIP.y,
      w: Math.max(
        MIN_W,
        typeof parsed.w === "number" ? parsed.w : DEFAULT_PIP.w
      ),
      h: Math.max(
        MIN_H,
        typeof parsed.h === "number" ? parsed.h : DEFAULT_PIP.h
      ),
    };
  } catch {
    return DEFAULT_PIP;
  }
}

export function savePipPos(p: PipPos) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PIP_STORAGE_KEY, JSON.stringify(p));
  } catch {
    // quota / disabled — ignore
  }
}

/** DEFAULT_PIP 의 -1 sentinel 을 실제 뷰포트 기준 "우하단 기본 위치" 로 해석. */
export function resolvePipPos(p: PipPos): PipPos {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const x = p.x < 0 ? Math.max(0, vw - p.w - 20) : p.x;
  const y = p.y < 0 ? Math.max(0, vh - p.h - 20) : p.y;
  return { x, y, w: p.w, h: p.h };
}
