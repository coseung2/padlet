"use client";

import type { Tool } from "../canvas/types";

interface ToolDef {
  id: Tool;
  label: string;
  icon: string;
}

export const TOOLS: ToolDef[] = [
  { id: "pencil", label: "연필", icon: "✏️" },
  { id: "pen", label: "펜", icon: "🖋" },
  { id: "marker", label: "마커", icon: "🖍" },
  { id: "airbrush", label: "에어브러시", icon: "💨" },
  { id: "watercolor", label: "수채", icon: "💧" },
  { id: "crayon", label: "크레용", icon: "🖌" },
  { id: "eraser", label: "지우개", icon: "🧽" },
  { id: "bucket", label: "페인트버킷", icon: "🪣" },
  { id: "eyedropper", label: "스포이트", icon: "💉" },
];

/** 가로 스크롤 가능한 도구 스트립 — BottomBar 중앙에 위치. */
export function ToolStrip({
  tool,
  onToolChange,
}: {
  tool: Tool;
  onToolChange: (t: Tool) => void;
}) {
  return (
    <div className="ds-tool-strip" role="toolbar" aria-label="도구">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`ds-tool-btn ${tool === t.id ? "is-active" : ""}`}
          aria-pressed={tool === t.id}
          aria-label={t.label}
          title={t.label}
          onClick={() => onToolChange(t.id)}
        >
          <span aria-hidden="true">{t.icon}</span>
        </button>
      ))}
    </div>
  );
}
