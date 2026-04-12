"use client";

import { useCallback, useEffect, useState } from "react";

// ParentInviteButton — slots into ClassroomDetail student row.
// Opens a modal that POSTs to /api/students/[id]/parent-invites and displays
// code + QR + expires countdown + uses-remaining + revoke + reissue.
// Read-only badges only; no live polling (SWR layer deferred to PV-8).

type InviteResponse = {
  id: string;
  code: string;
  qrPngDataUrl: string;
  expiresAt: string;
  maxUses: number;
  usesCount: number;
  joinUrl: string;
  reused?: boolean;
};

type Props = {
  studentId: string;
  studentName: string;
};

function formatCountdown(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "만료됨";
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}시간 ${m}분 남음`;
}

export default function ParentInviteButton({ studentId, studentName }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteResponse | null>(null);
  const [countdown, setCountdown] = useState<string>("");

  const issue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${studentId}/parent-invites`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const j = (await res.json()) as InviteResponse;
      setInvite(j);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const revoke = useCallback(async () => {
    if (!invite) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/parent-invites/${invite.id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setInvite(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [invite]);

  // Auto-issue on open
  useEffect(() => {
    if (open && !invite && !loading && !error) {
      void issue();
    }
  }, [open, invite, loading, error, issue]);

  // Countdown tick
  useEffect(() => {
    if (!invite) return;
    setCountdown(formatCountdown(invite.expiresAt));
    const t = window.setInterval(() => {
      setCountdown(formatCountdown(invite.expiresAt));
    }, 60_000);
    return () => window.clearInterval(t);
  }, [invite]);

  const onClose = useCallback(() => {
    setOpen(false);
    setError(null);
  }, []);

  const copyCode = useCallback(async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.code);
    } catch {
      // noop — user can read + type manually
    }
  }, [invite]);

  const copyUrl = useCallback(async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.joinUrl);
    } catch {
      // noop
    }
  }, [invite]);

  const usesLeft = invite ? invite.maxUses - invite.usesCount : 0;
  const expired = invite && new Date(invite.expiresAt).getTime() <= Date.now();
  const exhausted = invite && usesLeft <= 0;
  const needsReissue = expired || exhausted;

  return (
    <>
      <button
        type="button"
        className="classroom-row-btn"
        style={{
          backgroundColor: "var(--color-surface-alt, #f3f4f6)",
          color: "var(--color-text, #111827)",
          border: "1px solid var(--color-border, #e5e7eb)",
        }}
        onClick={() => setOpen(true)}
        title="학부모 초대 코드"
      >
        학부모 초대
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${studentName} 학부모 초대`}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={onClose}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--color-surface, #fff)",
              padding: 24,
              borderRadius: 8,
              maxWidth: 420,
              width: "90%",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18, color: "var(--color-text, #111827)" }}>
              학부모 초대 — {studentName}
            </h2>
            <p style={{ marginTop: 4, marginBottom: 16, fontSize: 13, color: "var(--color-text-muted, #6b7280)" }}>
              코드 + QR을 학부모 스마트폰으로 전달하세요. 48시간 유효, 최대 3명까지 사용할 수 있습니다.
            </p>

            {loading ? (
              <p style={{ color: "var(--color-text-muted, #6b7280)" }}>발급 중…</p>
            ) : error ? (
              <div>
                <p style={{ color: "var(--color-danger, #dc2626)" }}>오류: {error}</p>
                <button type="button" onClick={issue}>다시 시도</button>
              </div>
            ) : invite ? (
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono, ui-monospace, monospace)",
                    fontSize: 28,
                    fontWeight: 700,
                    letterSpacing: 4,
                    padding: "12px 16px",
                    border: "1px dashed var(--color-border, #e5e7eb)",
                    borderRadius: 6,
                    textAlign: "center",
                    color: "var(--color-text, #111827)",
                  }}
                >
                  {invite.code}
                </div>

                <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
                  {/* data: URL server-generated; next/image cannot optimise */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={invite.qrPngDataUrl} alt="학부모 초대 QR" width={180} height={180} />
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: "var(--color-text-muted, #6b7280)",
                  }}
                >
                  <span>{countdown}</span>
                  <span>
                    사용 {invite.usesCount}/{invite.maxUses}
                  </span>
                </div>

                {needsReissue ? (
                  <button
                    type="button"
                    onClick={issue}
                    style={{
                      marginTop: 12,
                      width: "100%",
                      padding: "8px 12px",
                      background: "var(--color-primary, #2563eb)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                    }}
                  >
                    재발급
                  </button>
                ) : (
                  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    <button type="button" onClick={copyCode} style={{ flex: 1, padding: 8 }}>
                      코드 복사
                    </button>
                    <button type="button" onClick={copyUrl} style={{ flex: 1, padding: 8 }}>
                      링크 복사
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={revoke}
                  style={{
                    marginTop: 8,
                    width: "100%",
                    padding: "6px 10px",
                    background: "transparent",
                    color: "var(--color-danger, #dc2626)",
                    border: "1px solid var(--color-danger, #dc2626)",
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                >
                  이 코드 철회
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              style={{
                marginTop: 16,
                width: "100%",
                padding: 8,
                background: "transparent",
                border: "1px solid var(--color-border, #e5e7eb)",
                borderRadius: 6,
              }}
            >
              닫기
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
