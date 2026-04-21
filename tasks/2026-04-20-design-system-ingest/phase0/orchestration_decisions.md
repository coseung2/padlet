# Orchestration Decisions Log — 2026-04-21

사용자가 "순서대로 쭉 오케스트레이션 해, 최종 보고 때 결정 사안들 검토"를 요청.
각 항목의 비자명한 결정과 그 근거, 되돌리고 싶을 때의 힌트를 누적 기록.

---

## T1-2 — `.ds-*` 전역 유틸 클래스

- **결정**: 신규 `src/styles/ds-utils.css` 파일로 분리 (base.css 하단에 inline 대안 탈락).
- **이유**: 토큰(base.css) ↔ 유틸 클래스 관심사 분리. T10에서 shared.css 통합할 때 재정리 용이.
- **충돌**: `drawing.css`에 `.ds-btn-primary/secondary` 동명 클래스 존재 (SaveDialog 전용). globals.css import 순서상 drawing.css가 뒤(27번)라 SaveDialog는 drawing.css 스타일 유지 → regression 0.
- **되돌리기**: ds-utils.css 삭제 + globals.css @import 제거.

## T1-3 — focus-visible 글로벌

- **결정**: code change 0, plan 체크박스만 업데이트.
- **이유**: base.css 159~163에 handoff와 동일 `:focus-visible` 룰 이미 존재.

## T2-1 — PNG 앱 아이콘 채택

- **결정**: `public/aura-app-icon-512.png` + `layout.tsx` metadata.icons (Next.js `app/icon.png` 관례 대신).
- **이유**: plan이 public/ 경로 명시 + parent-manifest.json이 이미 `/favicon.svg` 참조 중이라 public/이 익숙한 관례.
- **대안**: `src/app/icon.png` + `src/app/apple-icon.png` 파일 기반 자동 인식 (Next.js App Router 관례).
- **되돌리기**: metadata.icons 필드 제거 + PNG 파일 삭제.

## T2-2 — Logo 컴포넌트 도입

- **결정 1**: `src/components/Logo.tsx` 독립 컴포넌트. props = `{size, withWordmark}` handoff 그대로.
- **결정 2**: `<img>` 사용 (Next.js `<Image>`가 아님). handoff 패턴 보존 + 사이즈 prop 기반 인라인 스타일이 Next Image와 궁합 나쁨.
- **결정 3**: login 페이지 `.login-logo` CSS에서 cosmetic (bg/color/border-radius/font-*/letter-spacing) 제거 → 레이아웃(margin/display)만 유지. 내부에 `<Logo size={56}/>` 렌더.
- **이유**: dead CSS 생성 방지 + `.login-logo` wrapper semantic 유지.
- **되돌리기**: auth.css `.login-logo` 블록 복원 + login/page.tsx `<div className="login-logo">A</div>` 복원 + Logo.tsx 삭제 + ds-utils.css `.ab-logo-*` 블록 삭제.

## T4-1 — TeacherDashboard 카드 그리드

- **결정 1**: 기존 `board-grid-*` 클래스 네임스페이스 유지 (handoff `ab-board-*`로 rename 안 함).
- **이유**: surgical changes — rename은 다른 사용처 탐색 필요. handoff 수치만 적용해도 시각 목표 달성.
- **결정 2**: Kebab 메뉴를 인라인 스타일 → CSS 클래스(`.board-grid-kebab`, `.board-grid-kebab-menu`, `.board-grid-kebab-item`, `--danger` modifier)로 리팩토링.
- **이유**: 인라인 스타일이 `var(--color-muted, #94a3b8)` 등 디자인 토큰 우회 중. 클래스화 = 디자인 시스템 일관성 + T10 CSS 정리 부담 감소.
- **결정 3**: Link 영역을 `.board-grid-card-link` 클래스로 분리 (이전엔 인라인 flex 스타일).
- **결정 4**: Header(title/subtitle/우측 2버튼) 블록은 T4-1 스코프 밖. T3-1(TopNav) 또는 별도 작업에서 다룸.
- **되돌리기**: Dashboard.tsx 인라인 스타일 복원 + home.css `.board-grid-kebab-*`, `.board-grid-card-link` 블록 제거 + `.board-grid-card` 수치 원복.

---
