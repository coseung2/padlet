# Current Features — Aura-board

Live feature inventory. Update when merging feature tasks.

## Board layouts
| Layout | Description |
|---|---|
| `freeform` | 자유 배치 — react-draggable 카드 |
| `grid` | 그리드 정렬 |
| `stream` | 세로 피드 |
| `columns` | 칼럼(Kanban) |
| `assignment` | 과제 배부 + 제출 (AB-1 rewrite 2026-04-14: AssignmentSlot entity — roster-bound 5×6 grid, full-screen review modal, inline return reason, identity-based teacher/student/parent scope) |
| `quiz` | 실시간 퀴즈 |
| `plant-roadmap` | 식물 관찰일지 세로 타임라인 (2026-04-12 PJ-1~6, 2026-04-13 v2) |
| `drawing` | Drawpile 공동 그림판 + 학생 라이브러리 (2026-04-13, **schema + UI stub only** — 서버 배포 대기, `BLOCKERS.md`) |
| `breakout` | 모둠 학습 보드 (2026-04-12, foundation BR-1~BR-4) — 8종 템플릿(Free 3 + Pro 5), N모둠 × S섹션 자동 복사, teacher-pool 공용 섹션, "모든 모둠에 복제" 일괄 액션 |

## Classroom & Student
- 교사 `Classroom` 생성/수정 + 6-char classroom code
- `Student` 목록, QR + textCode 로그인, session cookie(HMAC)

## Plant Journal (2026-04-12)
- 10종 식물 카탈로그(`PlantSpecies` + `PlantStage`) — 토마토/딸기/해바라기/메리골드/무/상추/강낭콩/오이/고추/팬지
- 교사 `ClassroomPlantAllow`로 학급별 허용 종 제어
- 학생 `StudentPlant`: (board,student) 고유, 별명 1~20자, 단계 진행
- `PlantObservation` 사진 ≤10장 + 메모 ≤500자, 선택적 noPhotoReason
- 단계 역행 불가(자기 선언 advance만), 사진 0 + 사유 없음 → 400
- 교사 요약 뷰 (분포 badge + 학생 list + 7일+ 정체 경고)
- 교사 매트릭스 뷰 (보조 링크로 격하, owner + desktop≥1024, 칼럼 virtualization)

### v2 (2026-04-13)
- 학생 로드맵 레이아웃: 가로 지하철 → **세로 타임라인** (좌측 레일 + 각 단계 우측 인라인 관찰 카드). `StageDetailSheet`는 학생 플로우에서 제거됨 (파일은 보존).
- 교사 드릴다운 라우트: `/board/[id]/student/[studentId]` (board owner 전용, server component, 403 on non-owner).
- 교사가 요약 뷰 학생 행 클릭 → 해당 학생 로드맵을 편집 모드(`canEdit + editAnyStage`)로 열어 관찰 추가/수정/삭제 + 단계 이동.
- `PATCH /api/student-plants/[id]` (신규, nickname 수정) — student owner + classroom teacher 허용.
- `POST/PATCH/DELETE /api/student-plants/[id]/observations[...]` + `advance-stage` — classroom teacher 허용으로 완화.

## Auth
- NextAuth v5 + Google OAuth (teacher)
- 쿠키 기반 student session (qrToken/textCode)
- Dev mock auth (`as=owner|editor|viewer` cookie)

## Canva
- OAuth + iframe oEmbed + PDF export

## Section Actions Panel (2026-04-13)
- columns 보드 섹션 헤더 `⋯` 버튼 → ContextMenu 드롭다운 (owner/editor 노출)
  - 메뉴: **이름 변경**, **섹션 삭제**(danger), **Canva에서 가져오기**, (Canva 링크 존재 시) **PDF 내보내기** / **Canva 폴더로 정리**
  - rename/delete 선택 시 `SectionActionsPanel`(이름 변경 / 삭제 2탭) 오픈
- 신규 범용 프리미티브: `src/components/ui/SidePanel.tsx`
- `plant/StageDetailSheet` 는 동일 `SidePanel` 을 사용하도록 리팩터 (props 시그니처 불변)

## External API / Personal Access Tokens (2026-04-13, P0-②)
- `POST /api/external/cards` — Canva 콘텐츠 퍼블리셔 등 외부 통합이 교사 토큰으로 카드 생성
  - `Authorization: Bearer aura_pat_…` — 교사가 발급한 PAT
  - zod 검증: `boardId`, `title` 필수 / `content`, `imageDataUrl`(PNG data URL ≤5MB), `linkUrl`, `canvaDesignId` 선택
  - RBAC: board owner/editor만 허용, viewer → 403
  - Rate limit: 토큰당 60/min (in-memory fixed window)
  - 이미지: `BLOB_READ_WRITE_TOKEN` 있으면 Vercel Blob 업로드, 없으면 `public/uploads/` fallback
  - Canva designId → 서버측 oEmbed 자동 보강(linkImage/linkTitle/linkDesc)
- 교사 UI: `/account/tokens` — 발급 (라벨) / 리스트 (`lastUsedAt`) / 폐기
  - 평문 토큰 1회 노출 (DB 는 SHA-256 해시만 저장, 키=`NEXTAUTH_SECRET`)
  - 계정당 활성 토큰 최대 10개 → 초과 시 `token_limit_exceeded`
- `POST /api/account/tokens` (발급), `DELETE /api/account/tokens/[id]` (폐기) — NextAuth 세션 필요
- 신규 모델: `ExternalAccessToken { id, userId, name, tokenHash, lastUsedAt, revokedAt, createdAt }`
- 문서: [docs/external-api.md](./external-api.md)
- 블로커(외부 범위): Canva Apps SDK 프로젝트 + Developer Portal 등록은 사용자 외부 수행

## Board Settings Panel (2026-04-13)
- 보드 헤더 `제목` 우측 **⚙ 버튼** — owner/editor 전용
- 클릭 시 `BoardSettingsPanel` 우측 슬라이드 (`SidePanel` primitive 재사용)
- 탭:
  - **브레이크아웃** — 보드 섹션 리스트 + 각 행 링크 **생성/재발급/복사** (`POST /api/sections/:id/share` 재사용, 낙관적 UI + `router.refresh()`). layout != columns 또는 섹션 0개 시 빈 상태 노출
  - **접근 권한 (준비 중)**, **Canva 연동 (준비 중)**, **테마 (준비 중)** — 플레이스홀더
- `/board/[id]/s/[sectionId]/share` 라우트는 하위 호환 fallback 으로 유지 — 배너가 "⚙ 보드 설정 → 브레이크아웃" 경로로 안내

## 모둠 학습 보드 — Foundation (2026-04-12, BR-1 ~ BR-4)
- 신규 엔티티 3종: `BreakoutTemplate`, `BreakoutAssignment`, `BreakoutMembership`
- 시스템 템플릿 8종 (`prisma/seed-breakout-templates.ts` · `npm run seed:breakout` 멱등):
  - Free: KWL 차트 · 브레인스토밍 · 아이스브레이커
  - Pro: 찬반 토론 · Jigsaw · 모둠 발표 준비(peek) · 갤러리 워크(peek) · 6색 모자
- `POST /api/boards` 확장: `layout="breakout"` + `breakoutConfig` → 단일 트랜잭션으로 Board + Assignment + N*S group sections + 1 teacher-pool section + defaultCards 생성
- 독립 복사 원칙: 템플릿 `structure`는 개설 시점에 `JSON.parse(JSON.stringify())`로 deep clone → 템플릿 원본 수정이 기존 Board로 역전파되지 않음
- `GET /api/breakout/templates` — 시스템 + 교사 커스텀 템플릿 리스트
- `POST /api/breakout/assignments/[id]/copy-card` — 교사(owner) 전용 일괄 복제, teacher-pool + origin section 제외
- Tier gating stub: `src/lib/tier.ts` (`process.env.TIER_MODE`) — BR-5~9에서 `User.tier` 필드로 swap
- UI: `CreateBreakoutBoardModal` (3-step: 템플릿/구성/확인) + `BreakoutBoard` 교사 풀뷰 (모둠 N개 grid + 카드 컨텍스트 메뉴)
- 학생 격리 뷰: T0-① `/board/[id]/s/[sectionId]` 재사용

## 모둠 학습 보드 — Runtime (2026-04-12, BR-5 ~ BR-9)
- **BR-5 배포 모드 런타임**:
  - `link-fixed`: 교사가 섹션 링크 배포 → 학생 방문 시 `maybeAutoJoinLinkFixed` 자동 upsert
  - `self-select`: 학생이 `/b/[slug]/select`에서 모둠 선택 (초기 1회만, 변경은 교사 승인)
  - `teacher-assign`: 교사 대시보드에서 반 학생 → 모둠 배정
  - APIs: `PATCH /api/breakout/assignments/[id]` (deployMode/visibility/status/capacity), `POST/PATCH/DELETE /api/breakout/assignments/[id]/membership[/mid]` (정원 check + force override)
- **BR-6 가시성 WS 게이팅**:
  - `src/lib/rbac.ts#assertBreakoutVisibility` — own-only/peek-others + teacher-pool 섹션 분기
  - 섹션 진입 + `/api/sections/[id]/cards` 2경로 모두 게이트 통과
  - `GET /api/breakout/assignments/[id]/my-access` — 학생별 허용 섹션 + 채널 key 리스트 (WS 엔진 도입 시 그대로 사용)
- **BR-7 교사 대시보드**: `BreakoutAssignmentManager` 모달 — 미배정 학생 리스트 + 모둠별 배정 + 이동/제거 버튼 + link-fixed 링크 복사 + 정체 경고
- **BR-8 CSV 로스터 import**: `POST /api/breakout/assignments/[id]/roster-import` (multipart) — name/number 헤더 기반 Student upsert, classroom-scoped
- **BR-9 아카이브**: `PATCH status="archived"` + `/board/[id]/archive` 서버 컴포넌트 — 모둠별 카드 수 / 활동 학생 수 / 최근 활동 / 최종 카드 스냅샷
- **v2 파킹**: 월드카페 템플릿, 학생 셀프 모둠 이동, 실제 Tier 결제 모델, CSV export

## 과제 게시판 (AB-1) — 2026-04-14
- **신규 엔티티**: `AssignmentSlot` (boardId, studentId, slotNumber, cardId, submissionStatus, gradingStatus, grade, viewedAt, returnedAt, returnReason). 1 classroom = ≤ 30 slots, `@@unique([boardId, studentId])` + `@@unique([boardId, slotNumber])`.
- `Board` 확장: `assignmentGuideText`, `assignmentAllowLate`, `assignmentDeadline`.
- `Submission.assignmentSlotId @unique` nullable FK — legacy event-signup submissions remain valid at NULL.
- **POST `/api/boards` assignment branch**: classroom 전원(N≤30) AssignmentSlot + 빈 Card 자동 생성 트랜잭션. 가드 — `classroom_required` / `not_classroom_teacher` / `empty_classroom` / `classroom_too_large` / `student_missing_number`.
- **GET `/api/boards/[id]/assignment-slots`** — viewer-scoped projection (teacher: all; student: own 1; parent: through existing scope).
- **PATCH `/api/assignment-slots/[id]`** — 교사 전이 (`open`/`return`/`review`/`grade`). State machine in `src/lib/assignment-state.ts`; 24 unit tests.
- **POST `/api/assignment-slots/[id]/submission`** — 학생 제출/재제출; `canStudentSubmit()` 가드 (deadline + allowLate + gradingStatus).
- **POST `/api/boards/[id]/reminder`** — 미제출 bulk 뱃지 (5-min per-board cooldown, no email).
- **POST `/api/boards/[id]/roster-sync`** — 수동 roster 추가 (slotNumber = max+1).
- **UI rewrite `src/components/AssignmentBoard.tsx`**: Submission+BoardMember 경로 폐기, AssignmentSlot 기반 재작성. 풀스크린 모달(prev/next + 키보드 `←/→` + inline 반려) + 학생 guide 상단 `.assign-return-banner` + 학생 submit card.
- **Identity-based 권한**: teacher/student/parent 3tier (`project_permission_model` 메모리 정합). `BoardMember.role=editor` 학생용 행 생성 금지.
- **Parent viewer `/parent/(app)/child/[studentId]/assignments`**: AssignmentSlot-backed rows 우선 — `returnReason` 배너 렌더, `submissionStatus` 라벨(assigned/submitted/viewed/returned/reviewed/orphaned).
- **Realtime**: `assignmentChannelKey(boardId)` helper + 3 event types; `publish()` v1 no-op (engine 미정). 클라이언트는 `router.refresh()` + `useState` optimistic.
- **Deferred (phase8/9 문서화)**:
  - AC-12 WebP 썸네일 파이프라인 — sharp 미도입, `thumbUrl=imageUrl` passthrough (+ `loading="lazy"`, 160×120).
  - AC-13 Matrix 뷰 owner+desktop 서버 guard — 미구현, 기본 grid만 렌더.
  - AC-14 Galaxy Tab S6 Lite 실측 — 하드웨어 제약 defer.
