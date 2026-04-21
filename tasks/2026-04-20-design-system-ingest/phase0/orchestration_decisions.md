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

## T4-2 — CreateBoardModal 레이아웃 피커

- **결정 1**: CreateBoardModal의 **layout step만** 3열 grid 신규 (`.layout-grid-picker`/`.layout-grid-option`). classroom step은 기존 세로 리스트(`.layout-picker`/`.layout-option`) 유지.
- **이유**: 기존 `.layout-picker`는 CreateBreakoutBoardModal, AttachClassroomModal, CanvasSizePicker 등 4곳에서 재사용 중. 전역 grid 전환은 regression 위험. 신규 클래스 = surgical.
- **결정 2**: 모달 폭 520px → `min(92vw, 720px)`. 3열에 11개 옵션이 들어갈 공간 확보.
- **이유**: 3열 grid × emoji+label+desc 카드가 520px에서는 desc 잘림. classroom step도 같이 넓어지지만 해롭지 않음.
- **결정 3**: 540px 이하에선 2열로 자동 전환(@media).
- **되돌리기**: home.css의 `.layout-grid-*` 블록 + `.create-board-modal width` 복원(520px) + CreateBoardModal.tsx의 step=="layout" 섹션 className을 `.layout-picker/.layout-option/.layout-option-*`로 되돌리기.

## T3-1 — Global TopNav

- **결정 1 (중요)**: 탭을 **"보드 / 학급" 2개로 축소**. 사용자 컨펌이 "보드/학급/칼럼/DJ큐 + 은행/매점/역할"이었지만:
  - "칼럼" / "DJ 큐"는 **단일 보드의 레이아웃** 데모용 handoff 문구 → 실제 앱에서 전역 탭으로 의미 없음 (어느 보드?)
  - "은행" / "매점" / "역할"은 **학급 단위** 기능 → 전역 상단에 두면 "어느 학급?" 맥락 없음. ClassroomDetail 내부 네비(T6-2)로 남김.
  - 전역 탭은 맥락-독립적인 2개만.
- **사용자 확인 필요 여부**: 이 축소가 사용자 원래 의도와 다를 수 있음. 최종 보고 시 핵심 검토 포인트.
- **결정 2**: 전역 `.ab-topnav*` CSS는 `layout.css` 말미에 추가 (home.css가 아닌 이유: home만의 것이 아닌 전역 크롬).
- **결정 3**: "+ 새 보드" CTA는 TopNav 우측에 **넣지 않음**. Dashboard 내 `CreateBoardModal` 트리거 state를 전역으로 올리면 복잡도 급증. 우측에는 AuthHeader만.
- **결정 4**: TopNav 적용 범위 = HomePage + `/classroom` 리스트 2곳만. 보드 상세·학급 상세·학생/학부모 영역은 제외. T6에서 Classroom Detail 업그레이드 시 확장.
- **결정 5**: 로고 클릭 = `/`로 이동. Wordmark는 768px 이하 숨김 (미디어 쿼리).
- **결정 6**: `classroom/page.tsx`의 `← 대시보드` back-link 제거. TopNav "보드" 탭이 대체.
- **결정 7**: `HomePage`의 `AuthHeader`를 TopNav 내부로 이동. `UserSwitcher`(mock 전환용)는 home header 내부에 유지.
- **되돌리기**: TopNav.tsx 삭제 + layout.css `.ab-topnav*` 블록 제거 + home/classroom page에 기존 AuthHeader/back-link 복원.

---
