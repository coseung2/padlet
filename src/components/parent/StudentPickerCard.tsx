"use client";

// parent-class-invite-v2 — StudentPickerCard.
// Radio semantics within a parent <div role="radiogroup">. Displays original
// name (phase9_user_review/decisions.md #1 — masking removed).

export interface StudentLite {
  id: string;
  classNo: number;
  studentNo: number;
  name: string;
}

export interface StudentPickerCardProps {
  student: StudentLite;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function StudentPickerCard({ student, selected, onSelect }: StudentPickerCardProps) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      onClick={() => onSelect(student.id)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onSelect(student.id);
        }
      }}
      aria-label={`${student.classNo}-${student.studentNo} ${student.name}`}
      style={{
        position: "relative",
        minWidth: 132,
        minHeight: 116,
        padding: 16,
        borderRadius: "var(--radius-card)",
        background: selected ? "var(--color-accent-tinted-bg)" : "var(--color-surface)",
        border: selected
          ? "1px solid var(--color-accent)"
          : "1px solid var(--color-border)",
        boxShadow: selected ? "var(--shadow-card-hover)" : "var(--shadow-card)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        transition: "background-color 150ms ease, border-color 150ms ease",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: selected ? "6px solid var(--color-accent)" : "1px solid var(--color-border-hover)",
          background: "var(--color-surface)",
        }}
      />
      <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
        {student.classNo}-{student.studentNo}
      </span>
      <span style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text)", marginTop: 4 }}>
        {student.name}
      </span>
    </div>
  );
}
