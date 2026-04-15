"use client";

import { useRef } from "react";

// parent-class-invite-v2 — FilterBar.
// role="radiogroup" (amendment_v2 §3 — overrides phase5 design_spec's tablist
// annotation because semantics are mutually-exclusive single-selection).

export type FilterValue = "all" | "d3" | "d6";

export interface FilterBarProps {
  value: FilterValue;
  onChange: (next: FilterValue) => void;
}

const OPTIONS: Array<{ value: FilterValue; label: string }> = [
  { value: "all", label: "전체" },
  { value: "d3", label: "D+3 이상" },
  { value: "d6", label: "D+6 이상" },
];

export function FilterBar({ value, onChange }: FilterBarProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  return (
    <div
      role="radiogroup"
      aria-label="대기 목록 필터"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: 4,
        background: "var(--color-surface-alt)",
        borderRadius: "var(--radius-pill)",
      }}
    >
      {OPTIONS.map((opt, idx) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[idx] = el;
            }}
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                const n = OPTIONS[(idx + 1) % OPTIONS.length];
                onChange(n.value);
                refs.current[(idx + 1) % OPTIONS.length]?.focus();
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                const p = OPTIONS[(idx - 1 + OPTIONS.length) % OPTIONS.length];
                onChange(p.value);
                refs.current[(idx - 1 + OPTIONS.length) % OPTIONS.length]?.focus();
              }
            }}
            type="button"
            style={{
              padding: "8px 16px",
              minHeight: 44,
              border: "none",
              borderRadius: "var(--radius-pill)",
              background: selected ? "var(--color-surface)" : "transparent",
              color: selected ? "var(--color-text)" : "var(--color-text-muted)",
              fontSize: 14,
              fontWeight: selected ? 600 : 500,
              cursor: "pointer",
              boxShadow: selected ? "var(--shadow-lift)" : "none",
              transition: "background-color 150ms ease",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
