import Link from "next/link";

// PV-9 terminal state after teacher-initiated revoke or client-side 401.
// Deliberately rendered outside `(app)` so it doesn't trigger the layout
// session redirect (which would bounce the parent back to /join).

export const dynamic = "force-static";

export default function ParentLoggedOutPage() {
  return (
    <main
      style={{
        maxWidth: 420,
        margin: "0 auto",
        padding: "48px 16px",
        textAlign: "center",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
        color: "var(--color-text, #111827)",
      }}
    >
      <div
        aria-hidden
        style={{
          fontSize: 44,
          marginBottom: 16,
        }}
      >
        {"\u{1F512}"}
      </div>
      <h1 style={{ fontSize: 20, margin: 0 }}>접근이 해제되었습니다</h1>
      <p
        style={{
          fontSize: 14,
          color: "var(--color-text-muted, #6b7280)",
          marginTop: 12,
          lineHeight: 1.5,
        }}
      >
        교사가 연결을 해제했거나 세션이 만료되었습니다. 새 초대 코드를 받아 다시
        연결해 주세요.
      </p>
      <Link
        href="/parent/join"
        prefetch={false}
        style={{
          display: "inline-block",
          marginTop: 24,
          padding: "12px 24px",
          background: "var(--color-primary, #4f46e5)",
          color: "#fff",
          borderRadius: 8,
          textDecoration: "none",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        새 코드 입력하기
      </Link>
    </main>
  );
}
