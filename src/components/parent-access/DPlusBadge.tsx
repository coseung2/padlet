// parent-class-invite-v2 — DPlusBadge.
// 3-color band:
//   0..2  → surface-alt / muted text
//   3..5  → warning tinted bg / warning text
//   6+    → danger tinted bg / danger text
// Contract: phase5/design_spec.md §4.1. Always renders `D+{n}` text (never
// color alone — a11y).

export interface DPlusBadgeProps {
  value: number;
}

export function DPlusBadge({ value }: DPlusBadgeProps) {
  const v = Math.max(0, Math.floor(value));
  let bg = "var(--color-surface-alt)";
  let fg = "var(--color-text-muted)";
  if (v >= 6) {
    bg = "rgba(198, 40, 40, 0.08)";
    fg = "var(--color-danger)";
  } else if (v >= 3) {
    bg = "var(--color-warning-tinted-bg)";
    fg = "var(--color-warning)";
  }
  return (
    <span
      aria-label={`신청 후 ${v}일 경과`}
      title={`신청 후 ${v}일 경과`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2px 8px",
        borderRadius: "var(--radius-pill)",
        background: bg,
        color: fg,
        fontSize: 12,
        fontWeight: 600,
        minWidth: 40,
      }}
    >
      {`D+${v}`}
    </span>
  );
}
