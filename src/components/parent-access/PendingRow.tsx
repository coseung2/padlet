"use client";

import { useState } from "react";
import { DPlusBadge } from "./DPlusBadge";

// parent-class-invite-v2 — PendingRow in ApprovalInboxSection.
// Displays the parent's email + child's original name (no masking per
// phase9_user_review/decisions.md #1).

export type RejectReason = "wrong_child" | "not_parent" | "other";

export interface PendingLink {
  linkId: string;
  parentEmail: string;
  /** Used for the classroom detail page deep-link filter
   *  (/parent-access?student=...). Optional for back-compat. */
  studentId?: string;
  studentName: string;
  classNo: number;
  studentNo: number;
  requestedAt: string;
}

export interface PendingRowProps {
  link: PendingLink;
  onApprove: (linkId: string) => Promise<void> | void;
  onReject: (linkId: string, reason: RejectReason) => Promise<void> | void;
}

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function relative(iso: string): string {
  const d = daysSince(iso);
  if (d === 0) return "오늘 신청";
  return `${d}일 전 신청`;
}

export function PendingRow({ link, onApprove, onReject }: PendingRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const doApprove = async () => {
    setBusy(true);
    try {
      await onApprove(link.linkId);
    } finally {
      setBusy(false);
    }
  };

  const doReject = async (reason: RejectReason) => {
    setBusy(true);
    setMenuOpen(false);
    try {
      await onReject(link.linkId, reason);
    } finally {
      setBusy(false);
    }
  };

  const dplus = daysSince(link.requestedAt);
  const barColor =
    dplus >= 6 ? "var(--color-danger)" : dplus >= 3 ? "var(--color-warning)" : "var(--color-border)";

  return (
    <div
      role="listitem"
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px 12px 22px",
        minHeight: 72,
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          background: barColor,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: "var(--color-text)", fontWeight: 600 }}>
          {link.parentEmail}
        </div>
        <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 2 }}>
          {link.classNo}-{link.studentNo} · {link.studentName}
        </div>
      </div>
      <DPlusBadge value={dplus} />
      <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{relative(link.requestedAt)}</span>
      <button
        type="button"
        disabled={busy}
        onClick={doApprove}
        aria-label={`${link.studentName} 학부모 승인`}
        style={btnPrimary}
      >
        승인
      </button>
      <div style={{ position: "relative" }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => setMenuOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`${link.studentName} 학부모 거부`}
          style={btnSecondary}
        >
          거부 ▾
        </button>
        {menuOpen && (
          <div
            role="menu"
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 4px)",
              background: "var(--color-surface)",
              boxShadow: "var(--shadow-card-hover)",
              borderRadius: "var(--radius-card)",
              padding: 4,
              zIndex: 10,
              minWidth: 180,
            }}
          >
            <MenuItem label="자녀 정보 불일치" onClick={() => doReject("wrong_child")} />
            <MenuItem label="학부모가 아님" onClick={() => doReject("not_parent")} />
            <MenuItem label="기타" onClick={() => doReject("other")} />
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        background: "transparent",
        border: "none",
        fontSize: 14,
        color: "var(--color-text)",
        borderRadius: "var(--radius-btn)",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

const btnPrimary: React.CSSProperties = {
  minHeight: 44,
  padding: "10px 16px",
  borderRadius: "var(--radius-btn)",
  border: "none",
  background: "var(--color-accent)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};
const btnSecondary: React.CSSProperties = {
  minHeight: 44,
  padding: "10px 16px",
  borderRadius: "var(--radius-btn)",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};
