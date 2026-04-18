"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OnboardingShell } from "../_shell";

// parent-class-invite-v2 — P6 Rejected.
// Stepper is skipped on this page (component_contract.md §2.6).

export default function RejectedWrapper() {
  return (
    <Suspense fallback={null}>
      <RejectedPage />
    </Suspense>
  );
}

const COPY: Record<string, { title: string; body: string; allowRetry: boolean }> = {
  wrong_child: {
    title: "선택한 학생 정보가 일치하지 않아 연결이 처리되지 않았습니다",
    body: "자녀의 반/번호를 다시 확인하신 후 재신청해 주세요.",
    allowRetry: true,
  },
  not_parent: {
    title: "해당 학생의 보호자와 일치하지 않아 연결이 처리되지 않았습니다",
    body: "본인의 자녀 정보로 다시 신청해 주세요.",
    allowRetry: true,
  },
  other: {
    title: "연결 신청이 처리되지 않았습니다",
    body: "자세한 사유는 학교 대표 연락처로 문의해 주세요.",
    allowRetry: true,
  },
  code_rotated: {
    title: "학급 초대 코드가 갱신되어 기존 신청이 취소되었습니다",
    body: "선생님께 새 코드를 받아 다시 신청해 주세요.",
    allowRetry: true,
  },
  auto_expired: {
    title: "연결 신청이 7일 동안 승인되지 않아 자동 만료되었습니다",
    body: "필요하시면 다시 신청하실 수 있습니다.",
    allowRetry: true,
  },
  classroom_deleted: {
    title: "학급이 종료되어 연결이 해제되었습니다",
    body: "추가 문의는 학교 대표 연락처를 통해 확인해 주세요.",
    allowRetry: false,
  },
};

function RejectedPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const reason = sp.get("reason") ?? "other";
  const info = COPY[reason] ?? COPY.other;

  return (
    <OnboardingShell>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <h1 style={{ margin: "12px 0 8px", fontSize: 20, fontWeight: 700 }}>{info.title}</h1>
        <p style={{ margin: "0 0 24px", fontSize: 15, color: "var(--color-text-muted)", lineHeight: 1.6 }}>
          {info.body}
        </p>
        {info.allowRetry && (
          <button
            type="button"
            onClick={async () => {
              // Probe cooldown first (graceful).
              const r = await fetch("/api/parent/match/retry", { method: "POST" });
              if (!r.ok) return;
              router.push("/parent/onboard/match/code");
            }}
            style={{
              minHeight: 44,
              padding: "12px 24px",
              borderRadius: "var(--radius-btn)",
              border: "none",
              background: "var(--color-accent)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            다시 신청하기
          </button>
        )}
        <p style={{ marginTop: 24, fontSize: 12, color: "var(--color-text-faint)" }}>
          학교 대표 연락처는 담당 선생님께 문의해 주세요.
        </p>
      </div>
    </OnboardingShell>
  );
}
