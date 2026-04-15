"use client";

// parent-class-invite-v2 — Stepper (promoted to ui/, amendment_v2 §1.1).
// Contract: component_contract.md §2.
//
// variant="dot" only in v1. current is 1-indexed; out-of-range values are
// clamped at runtime (dev console.warn).

export type StepperVariant = "dot";

export interface StepperProps {
  current: number;
  total: number;
  variant?: StepperVariant;
  labels?: string[];
  ariaLabel?: string;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export default function Stepper({
  current,
  total,
  variant = "dot",
  labels,
  ariaLabel = "진행 단계",
}: StepperProps) {
  if (process.env.NODE_ENV !== "production") {
    if (current < 1 || current > total) {
      console.warn(`[Stepper] current=${current} is out of range 1..${total}; clamping.`);
    }
    if (labels && labels.length !== total) {
      console.warn(`[Stepper] labels length=${labels.length} ≠ total=${total}`);
    }
  }

  const safe = clamp(current, 1, Math.max(1, total));

  // variant reserved for future 'bar' expansion; v1 uses dot rendering only.
  void variant;

  return (
    <div
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={ariaLabel}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
      }}
    >
      {Array.from({ length: total }).map((_, idx) => {
        const stepNum = idx + 1;
        const reached = stepNum <= safe;
        const label = labels?.[idx];
        return (
          <span
            key={idx}
            aria-label={label ? `${label} (${stepNum} / ${total})` : undefined}
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: reached ? "var(--color-accent, #0075de)" : "var(--color-border-hover, rgba(0,0,0,0.15))",
              transition: "background-color 150ms ease",
            }}
          />
        );
      })}
      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {safe} of {total}
      </span>
    </div>
  );
}
