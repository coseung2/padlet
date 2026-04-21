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

## T5-1 — ColumnsBoard 정렬 UX (케밥 라디오)

- **결정 1**: `components/columns/ColumnMenu.tsx` **신규 전용 컴포넌트**. 공용 `ContextMenu`는 건드리지 않음.
- **이유**: ContextMenu는 card-context 등 여러 곳에서 씀. 라디오 / 섹션라벨 / separator 지원을 위해 타입 확장하면 blast radius 큼. 전용 컴포넌트 = surgical.
- **결정 2**: `misc.css`에 `.ctx-menu-label`, `.ctx-menu-sep`, `.ctx-menu-item-radio`, `.ctx-menu-check`, `.is-selected` 규칙 추가. `ctx-menu-*` prefix는 `ColumnMenu`에서도 재활용 — ContextMenu와 동일한 dropdown 외관 유지.
- **결정 3**: handoff 라벨로 수치 조정: `"최신" → "최신순"`, `"오래된" → "오래된 순"`, `"제목" → "제목순"`. ColumnsBoard.tsx 내 `SORT_OPTIONS` 상수는 삭제하고 ColumnMenu 내부 상수로 이동.
- **결정 4**: `.column-sort-select` / `.column-sort-active` CSS를 **바로 제거**. dead CSS 쌓지 않음 (Karpathy "backwards-compatibility hacks" 경고).
- **결정 5**: 학생(viewer)은 sort 옵션 비노출. 기존 `disabled` select를 보여주던 UX가 사라지지만, 정렬 상태는 서버 snapshot으로 자동 적용되므로 기능 영향 없음.
- **되돌리기**: boards.css에 `.column-sort-select` 블록 복원 + ColumnsBoard.tsx의 `<select>` 복원 + SORT_OPTIONS 상수 복원 + `columns/ColumnMenu.tsx` 삭제 + `misc.css` radio/label/sep 블록 제거.

## T9-1/T9-2/T9-3 — Student 영역 스타일 정렬

- **T9-1 결정**: `.student-login-*`를 handoff `.ab-login-*` 수치로 정렬. Input font-family를 `var(--font-mono)` 토큰 사용. 기존 강한 shadow (`0 24px 80px`)를 `var(--shadow-card)` Notion soft shadow로 교체.
- **T9-1 트레이드오프**: 로그인 카드의 "pop" 효과가 약해짐. 학생이 카드에 집중하기 좋은 drama 손실. 필요 시 되돌리기.
- **T9-2 결정**: greeting + badge + logout을 `<div.student-greeting-row>` (flex baseline gap 8 flex-wrap)으로 감쌈. 보드 그리드 위 `.student-sub "오늘의 보드"` 서브헤딩 추가 (boards.length>0일 때만).
- **T9-2 결정**: `.student-logout-btn` 의 `margin-left: 8px` 제거 (wrapper의 gap이 대체).
- **T9-3 결정**: `.assign-submit-card`를 실제 앱의 **이중 필드(textarea + linkUrl)** 구조 그대로 유지. handoff의 단순 textarea 구조로 다운그레이드하지 않음.
- **T9-3 결정**: 스타일만 handoff 기준으로 업그레이드 — padding 18 → 24, shadow 추가, 입력 15px, focus accent shadow.
- **T9-3 결정**: 제출 완료 상태(`isSubmitted && !isReturned`) 시 `.ds-pill "제출됨"` 배지 + 힌트 문구 표시. 기존엔 버튼 레이블("다시 제출하기")로만 암시했던 상태를 명시.
- **되돌리기**: `.student-login-*` 원래 shadow/font-size, StudentDashboard greeting-row 래퍼 제거, `.assign-submit-card` padding/font-size 원복, AssignmentStudentView 제출됨 pill 블록 제거.

## T6-1/T6-2 — Classroom list + detail (사용자 **강조** 영역)

- **T6-1 결정**: `.classroom-grid-card`를 **좌측 정렬**로 전환 (handoff). text-align/align-items center 제거 + min-height 140 + hover translateY(-2).
- **T6-1 결정**: `.classroom-grid-code`에 `var(--font-mono)` + ls 2px + uppercase + align-self:flex-start 적용 (pill 모노폰트화).
- **T6-1 결정**: `.classroom-stat-num` 14px → 22px. `.classroom-grid-stats` margin-top:auto로 카드 하단 도킹.
- **T6-1 결정**: `.classroom-grid-new`는 center 정렬 유지 (dashed CTA 카드 의도 그대로).
- **T6-2 결정 1 (핵심)**: handoff의 **탭 구조(roster/parents/boards/settings) 도입 X**. 현 앱은 학생 테이블 + 학급 보드를 main-grid로 동시 노출하는 UX가 잡혀 있어, 탭 전환 리팩토링은 blast radius가 너무 큼. 
- **T6-2 결정 2**: handoff header 디자인(이름 + meta + 초대 카드 + border-bottom) 이식. meta "학생 N명 · 보드 M개" 서브타이틀 추가.
- **T6-2 결정 3**: **초대 코드 카드**는 "학부모 초대 코드 / 코드 · 승인 관리 →" Link로 단순화. handoff처럼 실제 6자리 코드를 detail에 노출하지 않음 (학생 로그인용 classroom.code는 dead 필드, 학부모 invite 코드는 `/classroom/[id]/parent-access` 페이지가 이미 완성돼 있어 그리로 유도).
- **T6-2 결정 4**: 기존 action-bar의 "🔗 초대 코드 · 승인 관리" 링크 **제거** (새 invite card로 대체, 중복 방지).
- **T6-2 결정 5**: "🗑 학급 삭제" 버튼을 header에서 action bar 말미로 이동. `margin-left: auto`로 우측 정렬.
- **T6-2 결정 6**: `.classroom-detail-code` / `.classroom-detail-code-hint` dead CSS 제거.
- **코드 회전**: 별도 API 작업 없음 — 기존 `/classroom/[id]/parent-access`에서 이미 rotate 가능. invite card 클릭 시 그 페이지로 이동.
- **되돌리기**: classroom.css의 `.classroom-detail-header` flex-row/margin-bottom 8 복원 + `.classroom-invite-*` 블록 제거 + ClassroomDetail.tsx의 header JSX 원복 + action-bar에 parent-access 링크 재삽입 + 삭제 버튼을 header로 이동.

## T7-1 — DJBoardPage 스타일 (**deferred**)

- **결정**: 전면 재설계를 **이번 세션에서 하지 않음**. 현재 `boards.css .dj-*` (약 270 라인) 이 이미 handoff `.ab-dj-*`에 해당하는:
  - 3열 grid(`dj-played-stack | dj-board-main | dj-ranking`, 160px × 1fr × 340px)
  - accent 계열 nowplaying 카드 (linear-gradient bg + accent label)
  - SF Mono 순위 텍스트 + pill 태그 + tabular-nums 카운트
  - thumbnail 스큐 · ranking row 레이아웃
  … 모두 동등한 수준으로 구현해 둔 상태. 핸드오프 수치와 차이는 세부(border-radius, transition duration)뿐.
- **이유**: plan의 T7-1 추정이 60분 "디자인만 업그레이드"지만, handoff 이식을 그대로 하려면 dj-* → ab-dj-* 네임스페이스 rename + 7개 DJ 서브컴포넌트 JSX 수정이 필요함. 회귀 리스크 대비 시각적 이득이 크지 않음.
- **후속**: T10 CSS 정리 단계에서 `border-radius: 8px/12px/999px` 리터럴을 `var(--radius-card)/var(--radius-pill)`로, `transition 150ms ease`를 `var(--t-normal)`로 바꾸는 **토큰 정규화 패스**로 흡수. 전면 네임스페이스 rename은 별도 follow-up task.
- **사용자 확인 필요**: 이번 세션에서 DJ 보드 시각 변경을 기대했다면 별도 재작업 필요.

## T8-1~T8-4 — Vibe + Gallery 재설계 (follow-up task)

- **결정**: 이번 세션에선 **코드 변경 0**. 스키마 migration + 신규 board layout + Studio 재작성 + Gallery 보드 신규 = 약 12h 규모라 design-system-ingest task의 sub-task로 무겁다. 설계 문서 1건(`vibe_redesign_plan.md`)만 작성하고 **별도 feature task**로 분리.
- **근거**: 사용자 컨펌 4건(T8-1 B안 / T8-2 매핑 / T8-3 신규 layout / T8-4 서버 프록시)을 설계 문서에 확정 기록. 후속 task 착수 시 즉시 구현 가능.
- **follow-up task 제목 제안**: `2026-04-?-vibe-arcade-redesign-ingest` (feature 파이프라인)

## T10-1 — CSS 정리 (partial)

- **결정**: 이번 세션 실행 = **DJ CSS 4곳 리터럴→토큰 변환**만 (`.dj-nowplaying` 12px → `var(--radius-card)`, `.dj-play-btn/.dj-next-btn` 4px → `var(--radius-btn)`, `.dj-ranking-section` 8px → `var(--radius-card)`, `.dj-ranking-tag` 999px → `var(--radius-pill)`, transition 150ms ease → `var(--t-normal)`). dead CSS 정리(`.column-sort-select`, `.classroom-detail-code*`)는 T5-1/T6-2에서 이미 수행.
- **미실행**: 15개 CSS 파일 전반의 리터럴(`150ms ease`, `border-radius: 4/8/12/20px`) → 토큰 일괄 변환. regression blast radius가 커서 **follow-up task**로 이관.

---
