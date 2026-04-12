import { WithdrawClient } from "@/components/parent/WithdrawClient";

// Static confirm page — the interactive button lives in the client component
// so we don't have to mark the whole route as dynamic for an action.

export default function ParentWithdrawPage() {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: 16,
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
        color: "var(--color-text, #111827)",
      }}
    >
      <h1 style={{ fontSize: 20, margin: "8px 0 16px" }}>계정 탈퇴</h1>
      <section
        style={{
          padding: 16,
          background: "var(--color-surface, #fff)",
          border: "1px solid var(--color-border, #e5e7eb)",
          borderRadius: 12,
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        <p style={{ marginTop: 0 }}>
          탈퇴하면 모든 자녀 연결이 즉시 해제되고, 로그인도 종료됩니다. 교사에게
          새 초대 코드를 받으면 다시 연결할 수 있지만,
          <strong> 이전 활동 알림 이력은 복구되지 않습니다.</strong>
        </p>
        <p>
          탈퇴 후 <strong>90일</strong>이 지나면 이메일·이름 등 개인정보가
          SHA-256 해시로 익명화됩니다.
        </p>
      </section>
      <WithdrawClient />
    </main>
  );
}
