"use client";

import { useState } from "react";

// parent-class-invite-v2 — LinkedRow in LinkedParentsSection.

export interface LinkedItem {
  linkId: string;
  parentEmail: string;
  /** Used for the classroom detail page deep-link filter. Optional
   *  for back-compat. */
  studentId?: string;
  studentName: string;
  classNo: number;
  studentNo: number;
  approvedAt: string;
}

export interface LinkedRowProps {
  link: LinkedItem;
  onRevoke: (linkId: string) => Promise<void> | void;
}

export function LinkedRow({ link, onRevoke }: LinkedRowProps) {
  const [busy, setBusy] = useState(false);

  const doRevoke = async () => {
    setBusy(true);
    try {
      await onRevoke(link.linkId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="listitem"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 16px",
        minHeight: 48,
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: "var(--color-text)" }}>{link.parentEmail}</div>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
          {link.classNo}-{link.studentNo} · {link.studentName} · 승인 {new Date(link.approvedAt).toLocaleDateString("ko-KR")}
        </div>
      </div>
      <button
        type="button"
        onClick={doRevoke}
        disabled={busy}
        aria-label={`${link.studentName} 학부모 연결 해제`}
        style={{
          minHeight: 36,
          padding: "6px 12px",
          borderRadius: "var(--radius-btn)",
          border: "1px solid var(--color-danger)",
          background: "var(--color-surface)",
          color: "var(--color-danger)",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        해제
      </button>
    </div>
  );
}
