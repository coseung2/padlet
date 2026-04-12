"use client";

import { useEffect, useState } from "react";

// Public page: parent enters invite code + email. On success, a magic link is
// dispatched to the email. In dev (PARENT_EMAIL_ENABLED != true), the link
// URL is returned in the response for immediate testing.
//
// Prefilled code from ?code= (QR deep link) for single-tap UX.

type RedeemResponse = {
  ok: true;
  email: string;
  devMagicLinkUrl: string | null;
  delivered: boolean;
};

type ErrResp = { error: string };

function friendlyError(code: string): string {
  switch (code) {
    case "code_not_found":
      return "코드가 올바르지 않습니다. 교사에게 확인해주세요.";
    case "code_expired":
      return "코드가 만료되었습니다. 교사에게 재발급을 요청해주세요.";
    case "code_revoked":
      return "이 코드는 철회되었습니다.";
    case "code_exhausted":
      return "이 코드의 사용 횟수가 모두 소진되었습니다.";
    case "code_locked_out":
      return "잘못된 시도가 너무 많아 코드가 잠겼습니다. 교사에게 재발급을 요청해주세요.";
    case "rate_limited":
      return "시도가 너무 많습니다. 15분 후 다시 시도해주세요.";
    case "child_limit_exceeded":
      return "한 학부모 계정에 자녀는 최대 5명까지 연결할 수 있습니다.";
    case "invalid_input":
      return "입력값을 확인해주세요.";
    default:
      return "오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
}

export default function ParentJoinPage() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RedeemResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prefill code from ?code=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("code");
    if (c) setCode(c);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/parent/redeem-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim(), email: email.trim() }),
      });
      const j = (await res.json().catch(() => ({}))) as Partial<RedeemResponse & ErrResp>;
      if (!res.ok || !j.ok) {
        setError(friendlyError(j.error ?? "unknown"));
        return;
      }
      setResult(j as RedeemResponse);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 420,
        margin: "40px auto",
        padding: 16,
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
        color: "var(--color-text, #111827)",
      }}
    >
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>학부모 등록</h1>
      <p style={{ marginTop: 0, color: "var(--color-text-muted, #6b7280)", fontSize: 14 }}>
        교사가 전달한 초대 코드와 이메일을 입력하면 로그인 링크가 전송됩니다.
      </p>

      {result ? (
        <section
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid var(--color-border, #e5e7eb)",
            borderRadius: 8,
            background: "var(--color-surface-alt, #f9fafb)",
          }}
        >
          <h2 style={{ fontSize: 16, marginTop: 0 }}>확인 이메일을 보냈습니다</h2>
          <p style={{ fontSize: 14 }}>
            <strong>{result.email}</strong> 로 로그인 링크를 보냈습니다. 15분 이내에 확인해주세요.
          </p>
          {result.devMagicLinkUrl ? (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                background: "var(--color-warning-bg, #fef9c3)",
                border: "1px dashed var(--color-warning, #ca8a04)",
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              <strong>[DEV] 이메일 인프라 미연결</strong> — 다음 링크로 바로 인증하세요:
              <div style={{ marginTop: 6, wordBreak: "break-all" }}>
                <a href={result.devMagicLinkUrl}>{result.devMagicLinkUrl}</a>
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted, #6b7280)" }}>초대 코드</span>
            <input
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="예: H7K9M2"
              required
              maxLength={12}
              style={{
                padding: "10px 12px",
                fontSize: 18,
                letterSpacing: 2,
                fontFamily: "var(--font-mono, ui-monospace, monospace)",
                border: "1px solid var(--color-border, #e5e7eb)",
                borderRadius: 6,
                textTransform: "uppercase",
              }}
            />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted, #6b7280)" }}>이메일</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@example.com"
              required
              maxLength={200}
              style={{
                padding: "10px 12px",
                fontSize: 14,
                border: "1px solid var(--color-border, #e5e7eb)",
                borderRadius: 6,
              }}
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "10px 16px",
              marginTop: 4,
              background: "var(--color-primary, #2563eb)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 15,
              cursor: submitting ? "wait" : "pointer",
            }}
          >
            {submitting ? "확인 중…" : "로그인 링크 받기"}
          </button>
          {error ? (
            <p style={{ color: "var(--color-danger, #dc2626)", fontSize: 14, margin: 0 }}>{error}</p>
          ) : null}
        </form>
      )}
    </main>
  );
}
