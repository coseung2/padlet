import Link from "next/link";

export const metadata = {
  title: "Canva 앱 연결 안내 · Aura-board",
};

export default function CanvaSetupPage() {
  return (
    <main className="docs-page">
      <article className="docs-article">
        <Link href="/" className="docs-back">
          ← 대시보드로
        </Link>
        <h1 className="docs-title">Canva 앱 연결 안내</h1>
        <p className="docs-subtitle">
          Canva Content Publisher 앱으로 만든 작품을 Aura-board 보드에 바로
          게시할 수 있어요.
        </p>

        <section className="docs-section">
          <h2 className="docs-h2">1. 교사 — PAT 토큰 발급</h2>
          <p className="docs-p">
            <Link href="/settings/external-tokens" className="docs-link">
              외부 API 토큰 페이지
            </Link>
            에서 <code>cards:write</code> 스코프로 토큰을 발급받아 복사하세요.
            Canva 앱 설정에서 이 토큰을 한 번만 붙여넣으면 학생들이 공동으로
            사용할 수 있어요.
          </p>
        </section>

        <section className="docs-section">
          <h2 className="docs-h2">2. 학생 — Aura 로그인</h2>
          <p className="docs-p">
            각 학생은 Canva 에디터에서 Aura-board 앱 패널의 &ldquo;Aura로 로그인&rdquo;
            버튼을 눌러 학생 계정으로 로그인합니다. 로그인 후에는 본인이 쓴
            카드가 부모님께 자동으로 연결돼요.
          </p>
          <p className="docs-p docs-note">
            로그인 세션은 Canva 에디터와 브라우저에서 공유되므로, 학생이 다른
            학급 보드에 작품을 올리려 해도 차단됩니다.
          </p>
        </section>

        <section className="docs-section">
          <h2 className="docs-h2">3. 게시</h2>
          <p className="docs-p">
            디자인을 완성한 뒤 Canva 공유 메뉴에서 &ldquo;Aura-board로 게시&rdquo;를
            선택하면 보드와 섹션을 고르는 드롭다운이 나와요. 제목은 자동으로
            디자인 이름이 들어갑니다.
          </p>
        </section>

        <section className="docs-section">
          <h2 className="docs-h2">4. 문제가 생기면</h2>
          <ul className="docs-list">
            <li>
              <strong>&ldquo;학생 로그인이 필요해요&rdquo;</strong>가 뜨면 Canva 앱 패널의
              로그인 버튼을 눌러 학생 세션을 갱신하세요.
            </li>
            <li>
              <strong>&ldquo;학급이 달라요&rdquo;</strong>는 학생의 학급과 보드 학급이
              다를 때 나옵니다. 교사 계정에서 보드 - 학급 연결을 확인하세요.
            </li>
            <li>
              PAT가 유출된 것 같으면 토큰 페이지에서 즉시 폐기 후 재발급하면
              됩니다.
            </li>
          </ul>
        </section>
      </article>
    </main>
  );
}
