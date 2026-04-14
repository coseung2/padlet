import Link from "next/link";

export const metadata = {
  title: "개인정보처리방침 · Aura-board",
};

export default function PrivacyPage() {
  return (
    <main className="docs-page">
      <article className="docs-article">
        <Link href="/" className="docs-back">← 홈으로</Link>
        <h1 className="docs-title">개인정보처리방침</h1>
        <p className="docs-subtitle">최종 업데이트: 2026-04-14</p>

        <section className="docs-section">
          <h2 className="docs-h2">1. 수집 항목</h2>
          <ul className="docs-list">
            <li>
              <strong>계정 정보:</strong> 이메일, 이름, 프로필 이미지(선택),
              로그인 공급자(Google 등)
            </li>
            <li>
              <strong>학생 정보:</strong> 학급 소속, 학생 이름(교사가 등록한 값),
              학생 세션 쿠키
            </li>
            <li>
              <strong>보드 콘텐츠:</strong> 카드 제목·본문·이미지·링크·첨부,
              작성자 식별자
            </li>
            <li>
              <strong>Canva 연동:</strong> Canva Connect OAuth access/refresh
              토큰, Canva 디자인 ID 및 공개 미리보기 URL
            </li>
            <li>
              <strong>기술 정보:</strong> 접근 IP, User-Agent, 요청 로그(운영
              목적)
            </li>
          </ul>
        </section>

        <section className="docs-section">
          <h2 className="docs-h2">2. 수집 목적</h2>
          <ul className="docs-list">
            <li>계정 식별 및 접근 권한 검증</li>
            <li>보드·카드 저장 및 실시간 공유</li>
            <li>Canva 앱을 통한 디자인 게시 기능 제공</li>
            <li>학부모 알림(학부모 동의 범위 내)</li>
            <li>악성 접근 차단 및 요금 한도 집행</li>
          </ul>
        </section>

        <section className="docs-section">
          <h2 className="docs-h2">3. 보관 기간</h2>
          <p className="docs-p">
            계정 데이터는 회원 탈퇴 시까지 보관됩니다. 학급·보드 콘텐츠는 교사가
            수동으로 삭제할 때까지 유지됩니다. 로그와 임시 토큰(매직링크,
            학생 세션)은 최대 7일 이내 자동 소멸합니다.
          </p>
        </section>

        <section className="docs-section">
          <h2 className="docs-h2">4. 제3자 제공 및 연동 서비스</h2>
          <p className="docs-p">
            다음 업체와 연동하여 데이터를 처리합니다:
          </p>
          <ul className="docs-list">
            <li>
              <strong>Vercel:</strong> 서비스 호스팅 및 Blob 파일 저장
              (이미지·Canva 썸네일)
            </li>
            <li>
              <strong>Supabase (ap-northeast-2):</strong> 관계형 DB 호스팅
            </li>
            <li>
              <strong>Canva:</strong> OAuth 인증, 디자인 메타데이터 조회,
              oEmbed 썸네일
            </li>
            <li>
              <strong>Resend:</strong> 이메일 발송 (매직링크, 학부모 알림)
            </li>
          </ul>
          <p className="docs-p">
            위 서비스로 전달되는 데이터는 각 업체의 개인정보처리방침에 따라
            처리됩니다.
          </p>
        </section>

        <section className="docs-section">
          <h2 className="docs-h2">5. 이용자의 권리</h2>
          <p className="docs-p">
            이용자는 본인 정보의 열람·수정·삭제·처리 정지를 요청할 수 있습니다.
            학생 데이터는 해당 학급 담당 교사 또는 학부모가 대리 요청 가능합니다.
            요청은 <Link href="/support" className="docs-link">지원 페이지</Link>
            를 통해 접수됩니다.
          </p>
        </section>

        <section className="docs-section">
          <h2 className="docs-h2">6. 쿠키 사용</h2>
          <p className="docs-p">
            로그인 세션 유지를 위해 필수 쿠키(<code>session</code>,
            <code>student_session</code>)를 사용합니다. 마케팅·분석용 쿠키는
            사용하지 않습니다.
          </p>
        </section>

        <section className="docs-section">
          <h2 className="docs-h2">7. 보안</h2>
          <p className="docs-p">
            전송 구간은 HTTPS, 저장 데이터는 서비스 제공자 수준의 암호화를
            따릅니다. PAT 비밀키는 평문으로 저장되지 않으며 SHA-256 + pepper
            해시로만 보관됩니다.
          </p>
        </section>

        <section className="docs-section">
          <h2 className="docs-h2">8. 연락처</h2>
          <p className="docs-p">
            개인정보보호 문의: <a href="mailto:mallagaenge@gmail.com" className="docs-link">
              mallagaenge@gmail.com
            </a>
          </p>
        </section>
      </article>
    </main>
  );
}
