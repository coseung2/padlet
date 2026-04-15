"use client";

import { useState } from "react";
import { OnboardingShell } from "../_shell";

// parent-class-invite-v2 — P1 Signup.
// POST /api/parent/signup → magic link dispatched (or devUrl surfaced).

export default function ParentSignupPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<{ email: string; devUrl: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/parent/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        setError(j.error === "rate_limited" ? "시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." : "잠시 후 다시 시도해 주세요");
        return;
      }
      setSent({ email: email.trim(), devUrl: j.devMagicLinkUrl ?? null });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <OnboardingShell>
        <h1 style={titleStyle}>메일함을 확인해 주세요</h1>
        <p style={bodyStyle}>
          <strong>{sent.email}</strong> 으로 매직링크를 보냈습니다. 15분간 유효합니다.
        </p>
        {sent.devUrl && (
          <div style={devStyle}>
            [DEV] 이메일 인프라 미연결 — 다음 링크로 바로 인증하세요:
            <div style={{ marginTop: 6, wordBreak: "break-all" }}>
              <a href={sent.devUrl}>{sent.devUrl}</a>
            </div>
          </div>
        )}
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell step={1} total={4}>
      <h1 style={titleStyle}>학부모 가입</h1>
      <p style={bodyStyle}>자녀의 학급에 연결하려면 이메일을 입력해 주세요.</p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <input
          type="email"
          placeholder="parent@example.com"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="이메일"
          style={inputStyle}
        />
        <button type="submit" disabled={!valid || submitting} style={primaryBtn(valid && !submitting)}>
          {submitting ? "매직링크 발송 중..." : "매직링크 받기"}
        </button>
        {error && <p style={{ color: "var(--color-danger)", fontSize: 13, margin: 0 }}>{error}</p>}
      </form>
    </OnboardingShell>
  );
}

const titleStyle: React.CSSProperties = { margin: 0, fontSize: 22, fontWeight: 700 };
const bodyStyle: React.CSSProperties = { margin: "8px 0 0", fontSize: 15, color: "var(--color-text-muted)" };
const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  height: 48,
  fontSize: 15,
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-btn)",
  background: "var(--color-surface)",
};
const primaryBtn = (active: boolean): React.CSSProperties => ({
  height: 56,
  padding: "0 20px",
  borderRadius: "var(--radius-btn)",
  border: "none",
  background: active ? "var(--color-accent)" : "var(--color-border)",
  color: "#fff",
  fontSize: 15,
  fontWeight: 700,
  cursor: active ? "pointer" : "not-allowed",
  boxShadow: active ? "var(--shadow-accent)" : "none",
});
const devStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 12,
  background: "var(--color-warning-tinted-bg)",
  border: "1px dashed var(--color-warning)",
  borderRadius: 6,
  fontSize: 12,
};
