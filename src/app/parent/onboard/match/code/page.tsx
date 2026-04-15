"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CodeInput8 } from "@/components/parent/CodeInput8";
import { OnboardingShell } from "../../_shell";

// parent-class-invite-v2 — P3 Code Input.

export default function MatchCodePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (code8: string) => {
    setSubmitting(true);
    setErr(null);
    try {
      const r = await fetch("/api/parent/match/code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code8 }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 404) setErr("이 코드를 찾을 수 없습니다");
        else if (r.status === 410) setErr("이 코드는 만료되었습니다. 선생님께 새 코드를 요청해 주세요.");
        else if (r.status === 429) setErr("잠시 후 다시 시도해 주세요 (15분)");
        else if (r.status === 401) router.replace("/parent/onboard/signup");
        else setErr("오류가 발생했습니다");
        setCode("");
        return;
      }
      const ticket = j.ticket as string;
      router.push(`/parent/onboard/match/select?ticket=${encodeURIComponent(ticket)}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OnboardingShell step={2} total={4}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>학급 코드 입력</h1>
      <p style={{ margin: "8px 0 24px", fontSize: 15, color: "var(--color-text-muted)" }}>
        선생님께 받은 8자리 코드를 입력하세요.
      </p>
      <CodeInput8 value={code} onChange={setCode} onComplete={submit} disabled={submitting} autoFocus />
      {err && (
        <p style={{ textAlign: "center", marginTop: 12, color: "var(--color-danger)", fontSize: 13 }}>
          {err}
        </p>
      )}
      <button
        type="button"
        disabled={code.length !== 8 || submitting}
        onClick={() => submit(code)}
        style={{
          marginTop: 24,
          width: "100%",
          height: 56,
          borderRadius: "var(--radius-btn)",
          border: "none",
          background: code.length === 8 ? "var(--color-accent)" : "var(--color-border)",
          color: "#fff",
          fontSize: 15,
          fontWeight: 700,
          cursor: code.length === 8 && !submitting ? "pointer" : "not-allowed",
        }}
      >
        {submitting ? "확인 중..." : "다음"}
      </button>
    </OnboardingShell>
  );
}
