"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function StudentLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // ?from=... / ?return=... allow flows like /student/canva-pair and
  // /oauth/authorize to bounce through login and return to the intended
  // page. Restricted to same-origin relative paths to prevent open-redirect.
  function safeReturnTarget(): string {
    const raw = searchParams.get("from") ?? searchParams.get("return");
    if (!raw) return "/student";
    if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
    return "/student";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/student/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: trimmed }),
      });

      if (res.ok) {
        router.push(safeReturnTarget());
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "로그인에 실패했습니다");
        setBusy(false);
      }
    } catch {
      setError("네트워크 오류가 발생했습니다");
      setBusy(false);
    }
  }

  return (
    <div className="student-login-card">
      <h1 className="student-login-title">학생 로그인</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          className="student-login-input"
          placeholder="코드 입력"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError("");
          }}
          maxLength={6}
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
        {error && <p className="student-login-error">{error}</p>}
        <button
          type="submit"
          className="student-login-btn"
          disabled={busy || code.trim().length === 0}
        >
          {busy ? "확인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}
