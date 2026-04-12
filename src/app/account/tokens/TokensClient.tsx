"use client";

import { useState, useTransition } from "react";

export type TokenRow = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

function fmtDate(iso: string | null): string {
  if (!iso) return "없음";
  try {
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function TokensClient({ initial }: { initial: TokenRow[] }) {
  const [rows, setRows] = useState<TokenRow[]>(initial);
  const [openIssue, setOpenIssue] = useState(false);
  const [newName, setNewName] = useState("");
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setOpenIssue(false);
    setNewName("");
    setIssuedToken(null);
    setCopied(false);
    setError(null);
  }

  async function submitIssue() {
    setError(null);
    if (!newName.trim()) {
      setError("라벨을 입력해 주세요.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/account/tokens", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: newName.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.error === "token_limit_exceeded") {
            setError("최대 10개까지 발급 가능합니다. 사용하지 않는 토큰을 먼저 폐기하세요.");
          } else {
            setError(`발급 실패: ${data.error ?? res.status}`);
          }
          return;
        }
        setIssuedToken(data.token);
        // refresh the list from server
        const listRes = await fetch("/api/account/tokens");
        if (listRes.ok) {
          const { tokens } = await listRes.json();
          setRows(tokens);
        }
      } catch (e) {
        setError(`네트워크 오류: ${(e as Error).message}`);
      }
    });
  }

  async function handleRevoke(id: string) {
    if (!confirm("이 토큰을 폐기하면 사용 중인 외부 앱 연결이 끊깁니다. 계속할까요?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/account/tokens/${id}`, { method: "DELETE" });
      if (!res.ok) {
        alert("폐기 실패");
        return;
      }
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, revokedAt: new Date().toISOString() } : r))
      );
    });
  }

  async function copyToken() {
    if (!issuedToken) return;
    try {
      await navigator.clipboard.writeText(issuedToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          onClick={() => setOpenIssue(true)}
          disabled={pending}
        >
          + 새 토큰 발급
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          아직 발급된 토큰이 없습니다. 외부 앱 연동을 시작하려면 &quot;새 토큰 발급&quot;을 눌러주세요.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border border-slate-200">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium">라벨</th>
                <th className="px-4 py-3 text-left font-medium">마지막 사용</th>
                <th className="px-4 py-3 text-left font-medium">생성일</th>
                <th className="px-4 py-3 text-right font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {r.name}
                    {r.revokedAt && (
                      <span className="ml-2 rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                        폐기됨
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{fmtDate(r.lastUsedAt)}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtDate(r.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {r.revokedAt ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : (
                      <button
                        type="button"
                        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        onClick={() => handleRevoke(r.id)}
                        disabled={pending}
                      >
                        폐기
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openIssue && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="issue-title"
        >
          <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-xl">
            {issuedToken ? (
              <>
                <h2 id="issue-title" className="text-lg font-semibold">
                  토큰이 발급되었습니다
                </h2>
                <div
                  className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                  role="region"
                  aria-label="보안 경고"
                >
                  이 토큰은 다시 볼 수 없으니 지금 저장하세요. 화면을 닫은 뒤에는
                  다시 확인할 수 없습니다.
                </div>
                <div
                  className="rounded-md bg-slate-100 px-3 py-2 font-mono text-sm break-all"
                  role="region"
                  aria-label="생성된 토큰"
                >
                  {issuedToken}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className={`rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 ${copied ? "ring-2 ring-blue-500" : ""}`}
                    onClick={copyToken}
                    aria-live="polite"
                  >
                    {copied ? "복사됨 ✓" : "복사"}
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    onClick={reset}
                  >
                    확인
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id="issue-title" className="text-lg font-semibold">
                  새 토큰 발급
                </h2>
                <label className="block space-y-1 text-sm">
                  <span className="text-slate-700">라벨</span>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="예: 내 Canva 앱 v1"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={100}
                    autoFocus
                  />
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                    onClick={reset}
                    disabled={pending}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    onClick={submitIssue}
                    disabled={pending}
                  >
                    {pending ? "발급 중…" : "발급"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
