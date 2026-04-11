"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StudentLoginForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
        router.push("/student");
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
