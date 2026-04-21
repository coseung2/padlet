# Design System Handoff Ingest — 작업 계획

> **번들**: `C:/Users/심보승/Downloads/Aura-board Design System-handoff.zip` (Claude Design 내보내기)
> **전개 위치**: `tmp/design-handoff/aura-board-design-system/`
> **진행 방식**: 사용자가 항목별 컨펌 → 승인된 항목만 순차 구현 (커밋 단위 분리)
> **커스터마이즈**: ColumnsBoard는 **정렬 UX만 차용**, 레이아웃 본체는 현재 구현 유지

---

## 글로벌 원칙

1. **스키마 변경은 최소화** — UI·토큰·CSS 이식 우선. DB 모델 수정은 별도 결정 필요 항목으로 분리.
2. **기존 동작 regression 0** — 교체가 아닌 보강을 기본으로. handoff 파일은 HTML 프로토타입이라 React·TypeScript·Prisma 연동은 별도 작업.
3. **Karpathy Surgical Changes** — 각 항목의 `대체 대상`만 건드림. 인접 코드·기존 feature 리팩토 금지.
4. **ColumnsBoard 레이아웃은 기존 유지** — 사용자 명시. 정렬 UX만 차용 (P3).
5. **commit unit = 컨펌된 항목 1개** — 사용자가 각 항목 개별 승인 후 구현·커밋·푸시.

---

## 사전 준비 P0 (컨펌 불필요 · 즉시 적용 가능)

| ID | 항목 | 대상 | 작업 | 위험도 |
|---|---|---|---|---|
| **P0-1** | handoff 파일 읽기 정리 | `tmp/design-handoff/` | (이미 완료) 번들 전개 · 모든 파일 구조 파악 | - |
| **P0-2** | 토큰 gap 분석 | `src/styles/base.css` vs `colors_and_type.css` | 누락 토큰 목록 확정 → P1에서 반영 | - |

---

## Tier 1 — 토큰 + 전역 유틸 CSS (저위험, 공통 기반)

| ID | 항목 | 이식 파일 | 대상 기존 파일 | 작업 | 위험 | 추정 |
|---|---|---|---|---|---|---|
| **T1-1** | 누락 토큰 추가 | `colors_and_type.css` §Bank/§Type scale vars/§Tap-target/§Transitions | `src/styles/base.css` | `--color-bank-positive/negative`, `--font-mono`, 8 type roll 변수(display/title/subtitle/section/body/label/badge/micro × size/weight/ls), `--tap-min`, `--modal-max`, `--fab-bottom-safe`, `--t-fast/normal/slow/modal` 추가. 기존 hex 값은 건드리지 않음. | L | 10분 |
| **T1-2** | `.ds-*` 전역 유틸 클래스 | `colors_and_type.css` `.ds-card`, `.ds-pill`, `.ds-btn-primary`, `.ds-btn-secondary`, `.h1~.h5`, `.ds-body/.ds-label/.ds-badge/.ds-micro/.ds-code` | `src/styles/base.css` 하단 또는 신규 `src/styles/ds-utils.css` | 전역 semantic 클래스. 기존 컴포넌트는 영향 없음(새 클래스 네임스페이스). 신규 컴포넌트가 채택할 기반. | L | 15분 |
| **T1-3** | focus-visible 글로벌 스타일 | `colors_and_type.css` `:focus-visible { outline: 2px solid --color-accent-tinted-text; offset: 2px }` | `src/styles/base.css` | 기존 프로젝트 전역 focus 룰 확인 후 중복이면 skip, 아니면 추가 | L | 5분 |

**컨펌 대상**: T1-1 / T1-2 / T1-3 각각

---

## Tier 2 — 로고 & 앱 아이콘 (중위험, 브랜드 영향)

| ID | 항목 | 이식 자원 | 대상 | 작업 | 위험 | 추정 |
|---|---|---|---|---|---|---|
| **T2-1** | 앱 아이콘 PNG | `ui_kits/teacher/aura-app-icon-512.png` (512×512, teacher·student 동일 파일) | `public/aura-app-icon-512.png` (신규) + `app/layout.tsx` `<link rel="apple-touch-icon">` + manifest icon | handoff README는 "로고 없음, A 마크 CSS 생성"이라고 하면서도 PNG 파일을 동봉 — **모순**. 사용자 결정: PNG 사용할 것인가, 기존 CSS-only A마크 유지할 것인가? | M | 15분 |
| **T2-2** | Logo 컴포넌트(Shell.jsx) | `Shell.jsx` `Logo({size, withWordmark})` | `src/components/` 신규 `Logo.tsx` or `AuthHeader.tsx` 내부 | `<span class="ab-logo-lockup"><img> + "Aura-board" wordmark>` 패턴. 기존 AuthHeader는 텍스트만 — 이걸 Logo 컴포넌트로 대체. | M | 20분 |

**컨펌 대상**: T2-1(PNG 채택 여부), T2-2(Logo 컴포넌트 도입)

---

## Tier 3 — Teacher 전역 네비게이션

| ID | 항목 | 이식 | 대상 기존 | 작업 | 위험 | 추정 |
|---|---|---|---|---|---|---|
| **T3-1** | TopNav | `Shell.jsx` `TopNav({active, onNav})` — 탭: 보드 / 학급 / 칼럼 / DJ 큐 + 우측 `+ 새 보드` + 아바타 | 기존 `src/components/AuthHeader.tsx` + `src/components/Dashboard.tsx` 헤더 일부 | handoff는 4개 탭 고정. 실제 프로덕션은 더 많은 라우트(학급 bank, 매점 등). **탭 구성을 실제 라우트에 맞춰 확장**해야. 우측 `+ 새 보드` CTA는 현재 Dashboard에만 있음 → 전역 이동 | H | 45분 |

**컨펌 대상**: T3-1 전체 (탭 구성 사용자와 조율 필요)

---

## Tier 4 — 보드 생성 & 대시보드

| ID | 항목 | 이식 | 대상 기존 | 작업 | 위험 | 추정 |
|---|---|---|---|---|---|---|
| **T4-1** | TeacherDashboard 카드 그리드 | `teacher/Components.jsx` `TeacherDashboard` (`ab-board-grid`, `ab-board-card`, `ab-board-new` 대시드 카드, 케밥 ⋯ 복제/삭제) | `src/components/Dashboard.tsx` | 현재 Dashboard 디자인 대비 handoff가 더 정돈됨. Kebab(`⋯`) 메뉴로 복제/삭제 합침. emoji + layoutLabel 형식. | M | 30분 |
| **T4-2** | CreateBoardModal 레이아웃 피커 | `teacher/Components.jsx` `CreateBoardModal` (`ab-layout-grid` 2열 · emoji+label+desc) | 기존 `src/components/CreateBoardModal.tsx` (이미 유사한 LAYOUTS 배열 있음) | 주로 스타일 업그레이드. 로직 거의 동일. 방금 추가한 `vibe-arcade` 옵션도 유지. | L | 20분 |

**컨펌 대상**: T4-1 / T4-2

---

## Tier 5 — ColumnsBoard 정렬 UX만 차용 (사용자 지시)

| ID | 항목 | 이식 | 대상 기존 | 작업 | 위험 | 추정 |
|---|---|---|---|---|---|---|
| **T5-1** | Column kebab 메뉴 내 정렬 라디오 | `ColumnsBoardPage.jsx` `ColumnMenu` — 케밥 안에 구분선으로 정렬 4종(manual/newest/oldest/title) + ✓ 체크 + `--color-accent-tinted-bg` 하이라이트 | 기존 `src/components/ColumnsBoard.tsx`의 정렬 UI (현재 별도 드롭다운 or select) | 정렬 선택 방식만 교체. 기존 서버 API (`PATCH /api/sections/:id` sortMode 필드)와 SSE 전파는 그대로. 메뉴 아이템 리스트에 정렬 섹션 삽입. | M | 30분 |

**컨펌 대상**: T5-1

---

## Tier 6 — ClassroomPages

| ID | 항목 | 이식 | 대상 기존 | 작업 | 위험 | 추정 |
|---|---|---|---|---|---|---|
| **T6-1** | ClassroomListPage 카드 그리드 | `ClassroomPages.jsx` `ClassroomListPage` | `src/components/ClassroomList.tsx` / `ClassroomListPage.tsx` | 스타일 업그레이드 중심. 기존 라우트 유지. | M | 30분 |
| **T6-2** | ClassroomDetailPage + 코드 회전 | `ClassroomPages.jsx` `ClassroomDetailPage({onRotateCode})` | 기존 classroom detail 화면 + nav 탭(학생명부/보드/역할/은행/매점) | 기존 `ClassroomNav`와의 정합성 확인 필요. handoff는 nav 없이 단일 페이지. 확장 버전으로 조정 | M | 40분 |

**컨펌 대상**: T6-1 / T6-2

---

## Tier 7 — DJ 보드

| ID | 항목 | 이식 | 대상 기존 | 작업 | 위험 | 추정 |
|---|---|---|---|---|---|---|
| **T7-1** | DJBoardPage 스타일 | `DJBoardPage.jsx` 300라인 | 기존 `src/components/DJBoard.tsx` 외 DJ 관련 컴포넌트 | 기능은 이미 라이브(YouTube 큐 + 역할 기반). 디자인만 업그레이드. 코드 diff 클 가능성 — 상세 검토 필요. | M | 60분 |

**컨펌 대상**: T7-1 (필요 시 하위 sub-item 분할)

---

## Tier 8 — Vibe Coding Studio + Gallery ⚡

내 vibe-arcade 구현은 **백엔드 + 카탈로그 뼈대**만 완성 상태. handoff의 Vibe 디자인은 **학생별 슬롯 기반 HTML/CSS/JS 3탭 에디터** 패러다임이라 기존 backend와 구조적으로 차이 있음. 선결 판단 필요:

| ID | 항목 | 이식 | 대상 기존 | 판단 필요 | 위험 | 추정 |
|---|---|---|---|---|---|---|
| **T8-1** | HTML/CSS/JS 3탭 분리 편집 모델 | `VibeAndGalleryPages.jsx` `VibeEditor` (textarea 3탭 + `buildSrcDoc` 합성) | 없음 (신규) | **VibeProject 스키마**를 `htmlContent` 단일 필드 유지 + 클라 분리 편집(저장 시 합침)? 아니면 `htmlContent/cssContent/jsContent` 3 필드로 schema migration? | H | 2~4시간 |
| **T8-2** | 학생별 슬롯 그리드 + status 4종 | `VibeCodingBoardPage` (empty/in-progress/needs-review/submitted + 빈 슬롯 카드) | 내 Catalog 뼈대 재설계 | status 모델 정합: 내 `moderationStatus`(7 단계) → handoff `status`(4 단계) 매핑 또는 별도 필드 | H | 2~3시간 |
| **T8-3** | GalleryBoardPage | 별도 신규 보드 레이아웃 (`Board.layout="vibe-gallery"`) 또는 vibe-arcade 내부 필터 | 없음 | **신규 Board.layout enum 추가 필요** 여부 사용자 결정 | H | 3~4시간 |
| **T8-4** | Claude 대화 힌트(window.claude.complete) | handoff는 클라이언트에서 직접 Claude 호출 | 내 구현은 서버 프록시 `/api/vibe/sessions` SSE | handoff 방식은 보안상 부적합(쿠키 탈취/토큰 노출). 서버 프록시 유지 + handoff UI만 차용 | M | 2시간 |

**컨펌 대상**: T8-1(스키마 결정) / T8-2 / T8-3(별도 layout vs 통합) / T8-4

> **참고**: T8 시리즈는 내 phase7 후속 작업(Studio/PlayModal) 대체 가능. 만약 T8 이식 결정되면 내 `VibeCodingStudio.tsx` TODO는 **handoff 기반으로 구현**. 방금 production 배포된 현 VibeArcadeBoard 뼈대(gate-off/catalog empty)는 그대로 유지 가능 — Studio 열릴 때만 T8 UI.

---

## Tier 9 — Student 앱

| ID | 항목 | 이식 | 대상 기존 | 작업 | 위험 | 추정 |
|---|---|---|---|---|---|---|
| **T9-1** | StudentLoginForm | `student/Components.jsx` `LoginCard` (6자 대문자 입력, 모노스페이스, 큰 글자) | 기존 `src/components/StudentLoginForm.tsx` (handoff README: "이 파일에서 카피 복사"라고 명시 = 이미 정합도 높음) | 카피 거의 일치. 주로 스타일(`ab-login-card` 패딩·radius·shadow) 업그레이드. | L | 15분 |
| **T9-2** | StudentDashboard | `student/Components.jsx` `StudentDashboard` (`{name}님, 안녕하세요!` + 반 뱃지 + 로그아웃) | 기존 `src/components/StudentDashboard.tsx` | 레이아웃 재정비 | M | 25분 |
| **T9-3** | BoardView 제출 카드 (assignment) | `student/Components.jsx` `BoardView` (textarea + 제출됨 pill) | 기존 assignment 학생 제출 UI | scope 확인 필요 — handoff는 textarea 단순형, 실제는 multi-attachment + 파일·이미지 첨부 지원 | M | 30분 |

**컨펌 대상**: T9-1 / T9-2 / T9-3

---

## Tier 10 — shared.css 이식 (컴포넌트별 스타일 산재)

| ID | 항목 | 작업 | 위험 | 추정 |
|---|---|---|---|---|
| **T10-1** | `shared.css` 676줄을 기존 `src/styles/*.css` 해당 섹션별로 분해·이식 | 수동 mapping 필요 — `ab-board-*` → `boards.css`, `ab-login-*` → `auth.css` 등 | M | 1시간 (T1~T9 완료 후 마지막) |

**컨펌 대상**: T10-1 (T1~T9 전부 완료 후 자연 발생)

---

## 총 작업량 추정

| Tier | 항목 수 | 최소 | 최대 |
|---|---|---|---|
| T1 | 3 | 30분 | 45분 |
| T2 | 2 | 35분 | 1시간 |
| T3 | 1 | 45분 | 1시간 |
| T4 | 2 | 50분 | 1시간 |
| T5 | 1 | 30분 | 45분 |
| T6 | 2 | 1시간 | 1.5시간 |
| T7 | 1 | 1시간 | 1.5시간 |
| T8 | 4 | **9시간** | **12시간** (Vibe 재설계) |
| T9 | 3 | 1시간 | 1.5시간 |
| T10 | 1 | 1시간 | 2시간 |
| **합계** | **20** | **~15시간** | **~22시간** |

T8(Vibe 재설계)이 전체 작업량의 절반 이상.

---

## 제안 순서

1. **T1** (토큰 + 유틸) — 모든 하위 작업의 기반
2. **T2** (Logo/아이콘) — 사용자 결정 2가지 먼저
3. **T4** (Dashboard + Create modal) — teacher landing 먼저 개선
4. **T3** (TopNav) — landing과 같이 조율
5. **T5** (ColumnsBoard 정렬 토글) — 독립 작업, 짧음
6. **T9** (Student 앱) — 별도 surface, 독립
7. **T6** (Classroom) — middle scope
8. **T7** (DJ 보드) — 스타일만 차용
9. **T8** (Vibe+Gallery) — 가장 무거움, 스키마 결정 선행
10. **T10** (CSS 정리) — 마지막 정돈

---

## 컨펌 체크리스트 (사용자 확인 요청)

체크된 항목만 구현. 구현 후 해당 항목에 ✅ 마킹하고 커밋.

### 즉시 시작 가능 (스키마 영향 없음)
- [x] **T1-1** 누락 토큰 (bank/type vars/tap-min/transitions) — `src/styles/base.css` 반영 완료 (2026-04-21)
- [x] **T1-2** `.ds-*` 전역 유틸 클래스 — `src/styles/ds-utils.css` 신규 + `globals.css` import (2026-04-21)
- [x] **T1-3** focus-visible 글로벌 스타일 — `base.css` 159~163에 handoff와 동일 룰 이미 존재, skip 확정 (2026-04-21)
- [x] **T2-1** PNG 앱 아이콘 채택 — `public/aura-app-icon-512.png` + `layout.tsx` metadata.icons (2026-04-21)
- [ ] **T2-2** Logo 컴포넌트 도입
- [ ] **T3-1** TopNav 도입 (탭 구성은 실제 라우트에 맞춰 조정)
- [ ] **T4-1** TeacherDashboard 카드 그리드 스타일 업그레이드
- [ ] **T4-2** CreateBoardModal 레이아웃 피커 스타일 업그레이드
- [ ] **T5-1** ColumnsBoard 정렬 UX (케밥 메뉴 내 라디오 + ✓ 체크)
- [ ] **T6-1** ClassroomListPage 카드 그리드
- [ ] **T6-2** ClassroomDetailPage (기존 nav와 조율)
- [ ] **T7-1** DJBoardPage 스타일 업그레이드
- [ ] **T9-1** StudentLoginForm 스타일
- [ ] **T9-2** StudentDashboard 스타일
- [ ] **T9-3** Student BoardView 제출 카드
- [ ] **T10-1** shared.css 최종 정돈

### 선결 결정 필요 (스키마 또는 설계 영향) — ✅ 모두 컨펌 완료 (2026-04-21)
- [x] **T2-1** PNG 아이콘 채택 — 번들의 `aura-app-icon-512.png` 사용
- [x] **T3-1** TopNav 4탭 기본(보드/학급/칼럼/DJ큐) + 은행/매점/역할 탭 추가. 탭별 내부 구성도 handoff 따름. **학급 관리 디자인** 특히 채택 강조.
- [x] **T5-1** ColumnsBoard 정렬 UX만 차용 (레이아웃 본체는 기존 유지)
- [x] **T8-1** Vibe 스키마 = **B안(3필드 분리)** 확정. `htmlContent`는 body 전용으로 의미 축소, `cssContent`/`jsContent` 컬럼 추가. migration 필요.
- [x] **T8-2** status 매핑: handoff의 4단계(empty/in-progress/needs-review/submitted)를 기존 `moderationStatus`에 매핑 — 상세 매핑은 구현 시점 결정
- [x] **T8-3** Gallery Board — **별도 `Board.layout="vibe-gallery"`** 신규 enum 추가
- [x] **T8-4** 서버 프록시 유지 (현 `/api/vibe/sessions` SSE). `window.claude.complete` 직접 호출은 불가 (API Key 노출)

### 빌링 결정 (2026-04-21)
- Anthropic API 크레딧 별도 결제(Option A) 방식 유지. Local Claude Code CLI 프록시(Option B)는 Anthropic 2026-02 정책으로 서드파티 OAuth 재사용 금지라 배제. SEC-1 DB 암호화 key 스토어로 진화 예정.

---

## 사용자 결정 요청

1. **즉시 시작할 항목** 위 체크리스트에서 ✅ 표시
2. **T2-1**: PNG 아이콘 채택 vs 현 CSS A마크 유지
3. **T3-1**: 전역 탭 구성 (기본 handoff 4개 → 실제 라우트 매핑 필요)
4. **T8 시리즈**: Vibe 재설계 스키마 방향 (T8-1~T8-3)

체크 + 의견 주시면 순서대로 구현·커밋·main 푸시 진행.
