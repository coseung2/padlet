/**
 * /student/canva-pair
 *
 * 학생이 로그인한 뒤 이 페이지를 열면 Canva 앱에 붙여넣을 수 있는
 * aurastu_ 액세스 토큰을 즉시 발급·표시한다.
 *
 * 왜 이 페이지가 필요한가
 * ─────────────────────────
 * Canva 앱은 sandboxed iframe 에서 실행되고, 최신 브라우저는 iframe
 * 컨텍스트에서 aura-board 의 student_session 쿠키를 (3rd-party cookie
 * 차단으로) 전송하지 않는다. 따라서 쿠키 인증 대신 Authorization Bearer
 * 헤더로 전환해야 하고, 토큰을 학생에게 한 번 넘겨주기 위한 안전한
 * 브리지가 필요하다.
 */
import { redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/student-auth";
import { issueTokenPairFor } from "@/lib/oauth-server";
import { db } from "@/lib/db";
import Link from "next/link";
import { CopyButton } from "./CopyButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Canva 앱 연결 · Aura-board" };

export default async function CanvaPairPage() {
  const student = await getCurrentStudent();
  if (!student) {
    redirect("/student/login?from=/student/canva-pair");
  }

  const client = await db.oAuthClient.findUnique({ where: { id: "canva" } });
  if (!client) {
    return (
      <main className="oauth-page">
        <div className="oauth-card">
          <h1 className="oauth-title">⚠ Canva 클라이언트 미등록</h1>
          <p className="oauth-subtitle">
            OAuth 클라이언트 <code>canva</code> 가 DB 에 없습니다. 관리자에게
            연락해 주세요.
          </p>
        </div>
      </main>
    );
  }

  const pair = await issueTokenPairFor({
    studentId: student.id,
    clientId: "canva",
    scope: "cards:write",
  });

  return (
    <main className="oauth-page">
      <div className="oauth-card">
        <h1 className="oauth-title">Canva 앱에 붙여넣을 로그인 코드</h1>
        <p className="oauth-subtitle">
          {student.name} · 30일간 유효. Canva 앱 &ldquo;Paste login code&rdquo;
          칸에 아래 코드를 복사해 붙여넣으세요.
        </p>

        <pre
          style={{
            userSelect: "all",
            padding: 12,
            borderRadius: 8,
            background: "var(--color-surface-alt, #f4f4f6)",
            border: "1px solid var(--color-border, #e2e2ea)",
            wordBreak: "break-all",
            whiteSpace: "pre-wrap",
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          {pair.accessToken}
        </pre>

        <CopyButton token={pair.accessToken} />

        <p style={{ marginTop: 16, color: "#666", fontSize: 13 }}>
          코드는 로그인 상태에만 발급됩니다. 이 창은 안전하게 닫아도 됩니다.
        </p>

        <p style={{ marginTop: 8 }}>
          <Link href="/student/logout" className="docs-link">
            다른 학생으로 로그아웃
          </Link>
        </p>
      </div>
    </main>
  );
}

