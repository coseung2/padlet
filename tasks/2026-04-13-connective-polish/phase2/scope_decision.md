# Scope Decision — connective-polish

## 1. 선택한 UX 패턴

5개 서브스코프 각자 1개씩 채택:

| Sub | pattern_id | 사유 |
|---|---|---|
| A | `dual_gate_external_api` | 기존 `/cards` POST와 동형(메모리 canva_app_state.md) → 검증된 패턴 재사용, 학급 누출 위험 제거 |
| B | `sdk_external_url_request` | Canva 공식 API, iframe sandbox 우회 확정(phase1 research §1) |
| C | `role_selector_landing` | Seesaw 벤치 채택. Padlet 오리지널은 발견성 부족, Classroom식은 선-로그인 필요 → 교육 SaaS 표준 |
| D | `dashboard_quick_access_cluster` | solo 규모 고려 최소 cluster (SidePanel은 과함) |
| E | `semantic_token_only` | `docs/design-system.md` 명시 원칙, fallback 제거 포함 |

## 2. MVP 범위

### 포함 (IN)

**Subscope A — 외부 API 보안 패치** (padlet repo)
- `GET /api/external/boards` student_session 필수 가드 추가
- `GET /api/external/boards/[id]/sections` 동일 가드 + 보드 학급 검증
- 비로그인 → 401 `student_session_required`
- PAT 소유자 ≠ student.classroom.teacherId → 403
- 결과 집합은 `session.classroomId` 스코프 내 보드만

**Subscope B — Canva 앱 팝업 로그인** (별도 repo: `aura-canva-app`)
- `@canva/platform` 패키지 설치
- `src/intents/content_publisher/setting_ui.tsx`의 기존 `window.open()` 호출을 `requestOpenExternalUrl({ url })` 로 교체
- `response.status === "aborted"` 시 에러 토스트
- 로그인 URL은 `https://aura-board-app.vercel.app/student/login?return=canva`

**Subscope C — 메인 로그인 허브** (padlet repo)
- 비로그인 `/` 방문 시 3-way CTA 렌더 (미들웨어 or `src/app/page.tsx`에서 session 분기)
- 카드 3개: 교사(→`/login`) / 학생(→`/student/login`) / 학부모(→`/parent/join`)
- 교사 세션 존재 시 기존 대시보드 UI 유지 (회귀 없음)

**Subscope D — 네비게이션 연결** (padlet repo)
- 교사 대시보드 헤더에 "설정" 드롭다운: "외부 토큰", "Canva 앱 연결 안내", "디자인 시스템"(/docs 링크는 out)
- Classroom 상세 페이지에 탭 UI: "학생 로스터" | "학부모 초대" | "Breakout 세션"
- `/board/:id` 설정 패널(⚙)에 "아카이브 보기" 링크 보강

**Subscope E — 디자인 토큰 재적용** (padlet repo)
- 다음 6개 파일의 hardcoded hex → `var(--color-*)` 치환:
  - `src/app/(teacher)/settings/external-tokens/page.tsx`
  - `src/components/breakout/BreakoutBoard.tsx` (UI chrome만, `card.color` 보존)
  - `src/components/breakout/CreateBreakoutBoardModal.tsx`
  - `src/components/breakout/BreakoutAssignmentManager.tsx`
  - `src/app/board/[id]/archive/page.tsx`
  - `src/components/parent/ParentManagementTab.tsx` (fallback 제거)
- 추가 hotspot: `CanvaFolderModal.tsx`, `QuizPlay.tsx` hardcoded hex 발견 → 동일 치환

### 제외 (OUT)

| 항목 | 사유 | 후속 |
|---|---|---|
| OAuth 2.0 provider 구축 | Step 2 별도 task | 2026-04-1X-oauth2-provider |
| Drawpile/Cloudflare Stream/Blob 블로커 | 외부 설정 필요 | 사용자 작업 |
| 학부모 대상 OAuth 확장 | 학부모는 OAuth 대상 아님 | 없음 |
| `/login` 페이지의 Google OAuth UI 재디자인 | 현재 기능 정상, polish 불필요 | 없음 |
| `/account/tokens` 경로 리네이밍 | 실제 경로 `/(teacher)/settings/external-tokens` 유지 | 메모리 정정만 |

## 3. 수용 기준 (Acceptance Criteria)

### A — 외부 API 보안
1. 쿠키 없이 `GET /api/external/boards` 호출 시 HTTP 401 + `{error: "student_session_required"}` 반환
2. 다른 학급 학생의 student_session 쿠키로 호출 시 HTTP 403 + 학급 정보 leak 없음
3. 정상 로그인 학생 호출 시 응답 `boards[]` 전부 `classroomId === session.classroomId`
4. `/boards/[id]/sections` 동일 규칙 적용, `id` 가 다른 학급 보드면 403
5. `/api/external/cards` POST 회귀 없음 (기존 e2e 통과)

### B — Canva 앱 팝업
6. `aura-canva-app` 빌드 시 `@canva/platform` import 에러 없음
7. Canva 에디터 실기기에서 setting_ui의 "Aura로 로그인" 버튼 클릭 → 브라우저 새 탭/시트 열림 (스크린샷 증거)
8. 로그인 완료 후 setting_ui로 돌아와 `/api/external/whoami` 재호출, 배너에 학생 이름 표시
9. `response.status === "aborted"` 분기 시 토스트 노출 (코드 경로 단위 테스트)

### C — 로그인 허브
10. 비로그인 브라우저(시크릿)로 `/` 방문 시 3-way CTA 카드 3개 가시 (교사/학생/학부모 라벨)
11. 각 카드의 CTA 버튼 클릭 시 정확한 경로로 이동 (`/login`, `/student/login`, `/parent/join`)
12. 교사 세션 있는 브라우저로 `/` 방문 시 기존 대시보드(boards + classrooms) 렌더 — 회귀 없음

### D — 네비게이션
13. 교사 대시보드 헤더에 "설정" 드롭다운 존재, 3개 항목: 외부 토큰 / Canva 앱 연결 / (n3 예비)
14. 각 항목 클릭 시 대응 경로로 이동하고 404 없음
15. Classroom 상세 페이지에 3개 탭(로스터/학부모/Breakout) 가시, 각 탭 클릭 시 해당 섹션 노출
16. `/board/:id` 설정 패널에 "아카이브 보기" 링크 노출, 클릭 시 `/board/:id/archive` 이동

### E — 디자인 토큰
17. 지정 6개 파일 + 2개 hotspot(Canva/Quiz)에서 `#[0-9a-fA-F]{3,6}` hardcoded hex 0건 (grep 검증)
18. 동일 파일들에 `var(--color-*)`, `var(--radius-*)`, `var(--shadow-*)` 중 적어도 하나 사용
19. `ParentManagementTab.tsx`의 `var(--x, #fallback)` 패턴에서 fallback 제거 (토큰 로딩 보장)
20. visual regression: 6개 파일 렌더 시 기존 색상 의도 변경 없음 (눈으로 비교 OK)

## 4. 스코프 결정 모드

**Selective Expansion**

- 보안(A), Canva 필수 UX(B) → 지연 시 위험, 반드시 포함
- 로그인 허브(C), 네비(D) → 제품 발견성, 이번에 끝내면 이후 작업 효율 상승
- 디자인(E) → 이번에 병렬로 처리 가능하고 독립적이라 함께 진행
- OAuth 2.0, Drawpile, 블로커 → 의도적으로 Hold → Step 2 이후

## 5. 위험 요소

| # | 리스크 | 완화 |
|---|---|---|
| R1 | 서브스코프 B는 별도 repo(`aura-canva-app`)라 배포 파이프라인이 다름 | 오케스트레이터가 padlet repo phase10 완료 후 별도 "B" 서브-페이즈로 처리 |
| R2 | student_session 가드 추가가 Canva 앱의 현재 호출부에 쿠키 누락이면 회귀 | 메모리(project_canva_app_state.md)가 `credentials: include` + CORS 준비 완료 확인 |
| R3 | `/` 3-way CTA 렌더 변경이 서버 컴포넌트 session 감지 실패 시 로그인 교사에게도 CTA 노출 | phase3에서 auth helper 재사용 + 미들웨어 보완 |
| R4 | 디자인 토큰 치환 중 색상 의미 오매핑 (예: danger를 accent로) | phase6 디자인 리뷰에서 시각 검증 |
| R5 | 3-way CTA 디자인이 기존 design-system 컴포넌트로 구성 가능한지 미검증 | phase5에서 shotgun 4~6 variants 생성 후 phase6 선택 |
| R6 | Canva SDK 의존성 추가로 `aura-canva-app` 번들 사이즈 증가 | `@canva/platform`는 공식 필수 패키지 — 수용 |

## 6. 검증 게이트 체크

- 수용 기준 20개 (≥ 3) ✅
- 5개 섹션 전부 기재 ✅
- OUT 항목 이유 + 후속 여부 ✅
- 리스크 분석 존재 ✅

**스코프 검증 PASS → phase3 진행**
