"use client";

import type { CSSProperties, ReactNode } from "react";
import Stepper from "@/components/ui/Stepper";

// parent-class-invite-v2 — onboarding shell used by P1–P5 (+ skipped on P6).

export function OnboardingShell({
  step,
  total,
  children,
}: {
  step?: number;
  total?: number;
  children: ReactNode;
}) {
  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <header style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-accent)" }}>
            Aura-board
          </span>
        </header>
        {step != null && total != null && (
          <div style={{ marginBottom: 24 }}>
            <Stepper current={step} total={total} />
          </div>
        )}
        <main>{children}</main>
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: "var(--color-bg)",
};
const shellStyle: CSSProperties = {
  maxWidth: 480,
  width: "100%",
  padding: "48px 32px",
  background: "var(--color-surface)",
  borderRadius: "var(--radius-card)",
  border: "var(--border-card)",
  boxShadow: "var(--shadow-card)",
};
