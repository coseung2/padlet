/**
 * Exponential moving average smoothing for stroke samples.
 *
 *   smoothed = smoothed + α * (raw - smoothed)
 *   α        = max(0.05, 1 - stabilizer/12)
 *
 * stabilizer=0  → α ≈ 1     → no smoothing
 * stabilizer=10 → α ≈ 0.17  → noticeably steady strokes
 *
 * Pressure, tilt, timestamp 은 raw 그대로 보존한다 — 떨림 보정은 좌표
 * 에만 적용되어야 브러시 프로필(연필/에어브러시)의 필압 반응이 유지됨.
 */
import { useCallback, useRef } from "react";
import type { StrokeSample } from "../canvas/types";

export function useStabilizer(stabilizer: number) {
  const smoothed = useRef<{ x: number; y: number } | null>(null);

  const alpha = Math.max(0.05, 1 - stabilizer / 12);

  const begin = useCallback((sample: StrokeSample): StrokeSample => {
    smoothed.current = { x: sample.x, y: sample.y };
    return sample;
  }, []);

  const process = useCallback(
    (sample: StrokeSample): StrokeSample => {
      if (!smoothed.current) {
        smoothed.current = { x: sample.x, y: sample.y };
        return sample;
      }
      const nx = smoothed.current.x + (sample.x - smoothed.current.x) * alpha;
      const ny = smoothed.current.y + (sample.y - smoothed.current.y) * alpha;
      smoothed.current = { x: nx, y: ny };
      return { ...sample, x: nx, y: ny };
    },
    [alpha]
  );

  const reset = useCallback(() => {
    smoothed.current = null;
  }, []);

  return { begin, process, reset };
}
