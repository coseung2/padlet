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

export function Toolbar({
  tool,
  color,
  onToolChange,
  onColorClick,
}: {
  tool: Tool;
  color: string;
  onToolChange: (t: Tool) => void;
  onColorClick: () => void;
}) {
  return (
    <div className="ds-toolbar" role="toolbar" aria-label="도구">
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
      <div className="ds-toolbar-sep" aria-hidden="true" />
      <button
        type="button"
        className="ds-color-swatch"
        aria-label={`현재 색 ${color}`}
        title={`색 선택: ${color}`}
        onClick={onColorClick}
        style={{ background: color }}
      />
    </div>
  );
}
