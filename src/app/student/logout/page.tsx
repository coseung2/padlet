import { clearStudentSession } from "@/lib/student-auth";

export const dynamic = "force-dynamic";

/**
 * /student/logout — clears the top-level student_session cookie and renders
 * a self-closing confirmation page. Used by the Canva App panel's logout
 * popup so the cookie is cleared in the top-level aura-board cookie jar
 * (not the partitioned iframe jar that a POST from inside the Canva iframe
 * would otherwise affect).
 */
export default async function StudentLogoutPage() {
  await clearStudentSession();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        flexDirection: "column",
        gap: 12,
        fontFamily: "system-ui, sans-serif",
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>로그아웃되었습니다</h1>
      <p style={{ color: "#666" }}>이 창을 닫으면 앱으로 돌아갑니다.</p>
      <script
        // Auto-close if the window was opened by script (no-op otherwise).
        // The Canva app panel polls whoami — detecting the 401 flips the
        // state back to anonymous.
        dangerouslySetInnerHTML={{
          __html: "setTimeout(() => { try { window.close(); } catch {} }, 800);",
        }}
      />
    </div>
  );
}
