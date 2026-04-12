"use client";

/**
 * Teacher PAT management — Seed 8 CR-9.
 * Galaxy Tab S6 Lite 최적화: 터치 타겟 ≥ 44px, 모달 한 손 조작, 1회 노출 경고.
 */
import { useState, useTransition } from "react";

export type ClientToken = {
  id: string;
  name: string;
  tokenPrefix: string | null;
  scopes: string[];
  scopeBoardIds: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
};

const EXPIRY_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: "1일 (테스트)", value: 1 },
  { label: "30일", value: 30 },
  { label: "90일 (권장·기본)", value: 90 },
  { label: "365일", value: 365 },
  { label: "무기한", value: null },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "없음";
  try {
    return new Date(iso).toLocaleString("ko-KR", {
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

export default function ExternalTokensClient({
  initial,
  isPro,
  cap,
}: {
  initial: ClientToken[];
  isPro: boolean;
  cap: number;
}) {
  const [rows, setRows] = useState<ClientToken[]>(initial);
  const [openIssue, setOpenIssue] = useState(false);
  const [newName, setNewName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<number | null>(90);
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeCount = rows.filter((r) => !r.revokedAt).length;
  const atCap = activeCount >= cap;

  function reset() {
    setOpenIssue(false);
    setNewName("");
    setExpiresInDays(90);
    setIssuedToken(null);
    setCopied(false);
    setError(null);
  }

  async function refresh() {
    const res = await fetch("/api/tokens");
    if (res.ok) {
      const { tokens } = (await res.json()) as { tokens: ClientToken[] };
      setRows(tokens);
    }
  }

  function handleExpiryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    if (v === "null") setExpiresInDays(null);
    else setExpiresInDays(Number(v));
  }

  async function submitIssue() {
    setError(null);
    if (!newName.trim()) {
      setError("토큰 이름을 입력해주세요.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/tokens", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: newName.trim(),
            scopes: ["cards:write"],
            expiresInDays,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          const code = data?.error?.code;
          if (code === "tier_required") {
            setError("Pro 요금제가 필요합니다.");
          } else if (code === "token_limit_exceeded") {
            setError(`최대 ${cap}개까지 발급 가능합니다. 사용하지 않는 토큰을 먼저 폐기하세요.`);
          } else {
            setError(`발급 실패: ${data?.error?.message ?? code ?? res.status}`);
          }
          return;
        }
        setIssuedToken(data.token);
        await refresh();
      } catch (e) {
        setError(`네트워크 오류: ${(e as Error).message}`);
      }
    });
  }

  function handleRevoke(id: string) {
    if (!confirm("이 토큰을 폐기하면 사용 중인 외부 앱 연결이 즉시 끊깁니다. 계속할까요?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/tokens/${id}`, { method: "DELETE" });
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

  function downloadToken() {
    if (!issuedToken) return;
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const label = (newName || "aura").replace(/[^a-zA-Z0-9가-힣_-]/g, "_");
    const body = [
      "# Aura-board Personal Access Token",
      "",
      `- Label: ${newName}`,
      `- Issued: ${new Date().toISOString()}`,
      `- WARNING: Treat this token like a password. Anyone with this token can`,
      `  create cards on your boards via the Canva Content Publisher.`,
      "",
      issuedToken,
      "",
    ].join("\n");
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `aura-token-${label}-${date}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          활성 토큰 <strong>{activeCount}</strong> / {cap}
        </p>
        <button
          type="button"
          className="min-h-[44px] min-w-[44px] rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setOpenIssue(true)}
          disabled={pending || !isPro || atCap}
          aria-label="새 토큰 발급"
          title={!isPro ? "Pro 요금제 전용" : atCap ? `최대 ${cap}개 도달` : ""}
        >
          + 새 토큰 발급
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          아직 발급된 토큰이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{r.name}</span>
                  {r.revokedAt && (
                    <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">폐기됨</span>
                  )}
                  {r.expiresAt && new Date(r.expiresAt).getTime() < Date.now() && !r.revokedAt && (
                    <span className="rounded bg-amber-200 px-2 py-0.5 text-xs text-amber-900">만료</span>
                  )}
                </div>
                <div className="mt-1 font-mono text-xs text-slate-500">
                  {r.tokenPrefix ? `aurapat_${r.tokenPrefix}_••••…` : "(레거시 토큰 — 재발급 필요)"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  scopes: {r.scopes.join(", ") || "없음"} ·{" "}
                  {r.scopeBoardIds.length === 0 ? "모든 보드" : `${r.scopeBoardIds.length}개 보드`}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  마지막 사용: {fmtDate(r.lastUsedAt)} · 만료: {fmtDate(r.expiresAt)} · 발급: {fmtDate(r.createdAt)}
                </div>
              </div>
              {!r.revokedAt && (
                <button
                  type="button"
                  className="min-h-[44px] min-w-[44px] self-start rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  onClick={() => handleRevoke(r.id)}
                  disabled={pending}
                >
                  폐기
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {openIssue && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="issue-title"
        >
          <div className="w-full max-w-lg space-y-4 rounded-lg bg-white p-6 shadow-xl">
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
                  <strong>복사한 토큰은 다시 볼 수 없어요.</strong>
                  <p className="mt-1">
                    지금 복사하거나 .txt 파일로 다운로드하세요. 잃어버리면 재발급만 가능합니다.
                  </p>
                </div>
                <div
                  className="rounded-md bg-slate-100 px-3 py-2 font-mono text-xs break-all"
                  role="region"
                  aria-label="생성된 토큰"
                >
                  {issuedToken}
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className={`min-h-[44px] rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 ${copied ? "ring-2 ring-blue-500" : ""}`}
                    onClick={copyToken}
                    aria-live="polite"
                  >
                    {copied ? "복사됨 ✓" : "복사"}
                  </button>
                  <button
                    type="button"
                    className="min-h-[44px] rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                    onClick={downloadToken}
                  >
                    다운로드 (.txt)
                  </button>
                  <button
                    type="button"
                    className="min-h-[44px] rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    onClick={reset}
                  >
                    확인
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id="issue-title" className="text-lg font-semibold">새 토큰 발급</h2>
                <label className="block space-y-1 text-sm">
                  <span className="text-slate-700">이름 (라벨)</span>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="예: 3-2반 Canva 앱"
                    className="min-h-[44px] w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={100}
                    autoFocus
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-slate-700">Scope</span>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded bg-blue-100 px-2 py-1 text-blue-800">cards:write (Pro 전용)</span>
                  </div>
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-slate-700">유효기간</span>
                  <select
                    className="min-h-[44px] w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={expiresInDays === null ? "null" : String(expiresInDays)}
                    onChange={handleExpiryChange}
                  >
                    {EXPIRY_OPTIONS.map((o) => (
                      <option key={o.label} value={o.value === null ? "null" : String(o.value)}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-500">권장: 90일 회전</span>
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="min-h-[44px] rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                    onClick={reset}
                    disabled={pending}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="min-h-[44px] rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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
