/**
 * Multi-touch viewport gestures — Ibis Paint 패턴.
 *
 *   2-finger pinch  → zoom (0.25× ~ 8×)
 *   2-finger drag   → pan
 *   2-finger tap    → undo  (모든 손가락 <250ms 내 릴리즈 + 이동 <10px)
 *   3-finger tap    → redo  (동일 판정)
 *   double tap      → fit (zoom=1, pan={0,0})
 *
 * Consumer 는 `onTouchStart/Move/End/onDoubleTap` 을 viewport wrapper
 * element 에 걸고, `cancelActiveStroke` 콜백으로 진행 중 stroke 을
 * 취소해 stroke 과 pinch 가 충돌하지 않도록 한다.
 */
import { useCallback, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";

const TAP_MAX_MS = 250;
const TAP_MAX_MOVE = 10;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 8;

interface GestureSession {
  startDist: number;
  startZoom: number;
  startMidX: number;
  startMidY: number;
  startPanX: number;
  startPanY: number;
  fingers: number;
  tapStart: number; // 0 ⇒ tap 판정 무효
}

export interface UseViewportGesturesOptions {
  onUndo: () => void;
  onRedo: () => void;
  cancelActiveStroke: () => void;
}

export function useViewportGestures({
  onUndo,
  onRedo,
  cancelActiveStroke,
}: UseViewportGesturesOptions) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const sessionRef = useRef<GestureSession | null>(null);

  const fit = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const onTouchStart = useCallback(
    (e: ReactTouchEvent<HTMLElement>) => {
      if (e.touches.length < 2) return;
      cancelActiveStroke();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      sessionRef.current = {
        startDist: Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY),
        startZoom: zoom,
        startMidX: (t1.clientX + t2.clientX) / 2,
        startMidY: (t1.clientY + t2.clientY) / 2,
        startPanX: pan.x,
        startPanY: pan.y,
        fingers: Math.min(3, e.touches.length),
        tapStart: Date.now(),
      };
    },
    [cancelActiveStroke, pan.x, pan.y, zoom]
  );

  const onTouchMove = useCallback(
    (e: ReactTouchEvent<HTMLElement>) => {
      const s = sessionRef.current;
      if (!s || e.touches.length < 2) return;
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      const nextZoom = Math.max(
        ZOOM_MIN,
        Math.min(ZOOM_MAX, s.startZoom * (dist / s.startDist))
      );
      setZoom(nextZoom);
      setPan({
        x: s.startPanX + (midX - s.startMidX),
        y: s.startPanY + (midY - s.startMidY),
      });
      // 이동 거리 > 임계 → tap 무효화
      const moveDelta = Math.hypot(midX - s.startMidX, midY - s.startMidY);
      if (moveDelta > TAP_MAX_MOVE) s.tapStart = 0;
      if (Math.abs(dist - s.startDist) > TAP_MAX_MOVE) s.tapStart = 0;
      // 3-finger 진입은 touchstart 에서 fingers 갱신이 어렵기 때문에 여기서
      // 확인 (ibis 에선 2-finger 시작 후 3번째 손가락이 추가되는 케이스).
      if (e.touches.length === 3 && s.fingers < 3) s.fingers = 3;
    },
    []
  );

  const onTouchEnd = useCallback(
    (e: ReactTouchEvent<HTMLElement>) => {
      const s = sessionRef.current;
      if (s && s.tapStart && Date.now() - s.tapStart < TAP_MAX_MS) {
        if (s.fingers === 3) onRedo();
        else if (s.fingers === 2) onUndo();
      }
      if (e.touches.length < 2) sessionRef.current = null;
    },
    [onRedo, onUndo]
  );

  return {
    zoom,
    pan,
    setZoom,
    setPan,
    fit,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
