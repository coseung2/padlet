"use client";

// Teacher LLM API Key 입력 폼 (/docs/ai-setup 페이지 하단 마운트).
// 붙여넣기 → 저장 → 서버가 즉시 각 사 API에 테스트 호출로 검증.
// 성공 시 "연결됨 ✓ sk-...xxxx" 배지, 실패 시 에러 메시지.

import { useEffect, useState } from "react";

type KeyStatus =
  | { present: false }
  | {
      present: true;
      provider: "claude" | "openai" | "gemini";
      last4: string;
      verified: boolean;
      verifiedAt: string | null;
      lastError: string | null;
      updatedAt: string;
    };

const PROVIDER_LABEL: Record<string, string> = {
  claude: "Claude (Anthropic)",
  openai: "ChatGPT (OpenAI)",
  gemini: "Gemini (Google)",
};

export function LlmKeyForm() {
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [provider, setProvider] = useState<"claude" | "openai" | "gemini">("claude");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function loadStatus() {
    try {
      const res = await fetch("/api/teacher/llm-key", { cache: "no-store" });
      if (!res.ok) {
        setStatus({ present: false });
        return;
      }
      const data = (await res.json()) as KeyStatus;
      setStatus(data);
      if (data.present) setProvider(data.provider);
    } catch {
      setStatus({ present: false });
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/teacher/llm-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: apiKey.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(`저장 실패: ${data.error ?? res.statusText}`);
      } else if (data.verified) {
        setMsg("저장 완료. 학급 아케이드 보드에서 바로 사용할 수 있습니다.");
        setApiKey("");
      } else {
        setMsg(
          `저장은 되었지만 검증 실패: ${data.lastError ?? "알 수 없는 오류"}. Key/결제 상태 확인 후 다시 저장하세요.`,
        );
        setApiKey("");
      }
      setStatus(data);
    } catch (err) {
      setMsg(`저장 실패: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("저장된 API Key를 삭제하시겠어요? 학급 아케이드는 새 Key를 저장하기 전까지 사용할 수 없어요.")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/teacher/llm-key", { method: "DELETE" });
      if (res.ok) {
        setStatus({ present: false });
        setMsg("삭제되었습니다.");
      } else {
        setMsg("삭제 실패");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="llm-key-form">
      {status?.present && (
        <div className={`llm-key-status ${status.verified ? "is-ok" : "is-warn"}`}>
          <div className="llm-key-status-row">
            <span className="llm-key-status-dot" aria-hidden>
              {status.verified ? "●" : "▲"}
            </span>
            <span className="llm-key-status-text">
              {status.verified ? "연결됨" : "검증 실패"} ·{" "}
              {PROVIDER_LABEL[status.provider] ?? status.provider} · ...{status.last4}
            </span>
            <button
              type="button"
              className="llm-key-delete"
              onClick={handleDelete}
              disabled={busy}
            >
              삭제
            </button>
          </div>
          {!status.verified && status.lastError && (
            <p className="llm-key-error">{status.lastError}</p>
          )}
          {status.verified && status.verifiedAt && (
            <p className="llm-key-hint-small">
              마지막 검증 {new Date(status.verifiedAt).toLocaleString("ko-KR")}
            </p>
          )}
        </div>
      )}

      <form className="llm-key-fields" onSubmit={handleSave}>
        <label className="llm-key-field">
          <span>사용할 AI</span>
          <select
            className="llm-key-select"
            value={provider}
            onChange={(e) => setProvider(e.target.value as "claude" | "openai" | "gemini")}
            disabled={busy}
          >
            <option value="claude">Claude (Anthropic) — 추천</option>
            <option value="openai">ChatGPT (OpenAI)</option>
            <option value="gemini">Gemini (Google)</option>
          </select>
        </label>

        <label className="llm-key-field">
          <span>API Key</span>
          <input
            type="password"
            className="llm-key-input"
            placeholder={
              provider === "claude"
                ? "sk-ant-api03-..."
                : provider === "openai"
                  ? "sk-proj-... 또는 sk-..."
                  : "AIza..."
            }
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={busy}
            autoComplete="off"
            spellCheck={false}
          />
          <span className="llm-key-hint">
            Key는 서버에서 암호화 저장되며 학생 클라이언트에 노출되지 않습니다.
          </span>
        </label>

        <button
          type="submit"
          className="llm-key-submit"
          disabled={busy || apiKey.trim().length < 8}
        >
          {busy ? "저장 중…" : status?.present ? "다시 저장" : "저장 + 검증"}
        </button>
      </form>

      {msg && <p className="llm-key-msg">{msg}</p>}
    </div>
  );
}
