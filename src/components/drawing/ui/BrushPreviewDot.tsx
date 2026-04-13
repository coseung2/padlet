"use client";

/**
 * 현재 도구 / 색 / 굵기 / 불투명 을 작은 원으로 표시 — 캔버스 우측
 * 상단 corner 에 fixed. Ibis 의 브러시 프리뷰에 해당.
 */
export function BrushPreviewDot({
  color,
  size,
  opacity,
  zoom,
  tool,
}: {
  color: string;
  size: number;
  opacity: number;
  zoom: number;
  tool: string;
}) {
  // 화면 표시 지름 = 실 사이즈 * zoom * 0.5. 너무 작으면 안 보이고, 너무
  // 크면 UI 를 가리므로 6~40 로 clamp.
  const displaySize = Math.max(6, Math.min(40, size * zoom * 0.5));
  // 지우개 표시 — 패턴이 있어야 지우는 도구라는 걸 직감
  const isEraser = tool === "eraser";
  return (
    <div
      className="ds-brush-preview"
      aria-hidden="true"
      style={{
        width: displaySize,
        height: displaySize,
        background: isEraser ? "transparent" : color,
        opacity: isEraser ? 1 : opacity,
        borderStyle: isEraser ? "dashed" : "solid",
      }}
    />
  );
}
