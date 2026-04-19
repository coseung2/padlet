# Aura-board — Architecture

단일 소스. 신규/수정 데이터 모델·API·컴포넌트 트리를 여기에 기록한다.

## Stack (lockdown)

- Next.js 16 App Router (Turbopack dev)
- React 19 + TypeScript 5
- Prisma 6 + PostgreSQL (Supabase, region ap-northeast-2)
- NextAuth 5 beta + Prisma Adapter
- Student session: custom HMAC cookie (`src/lib/student-auth.ts`)
- Realtime engine: **미정** — `src/lib/realtime.ts`는 채널 키 helper만 제공. 실제 pub/sub 엔진은 별도 research task.

## Auth & RBAC

`src/lib/rbac.ts`
- `getBoardRole(boardId, userId)` — board-level role lookup.
- `requirePermission(boardId, userId, action)` — throws `ForbiddenError`.
- **`viewSection(sectionId, ctx)`** (T0-① 2026-04-12): section-scoped access gate. Allow paths:
  1. Matching `token` (constant-time compare).
  2. NextAuth user that is a board member.
  3. Student whose `classroomId` matches `board.classroomId`.

## Realtime

`src/lib/realtime.ts`
- `boardChannelKey(boardId)` → `board:{boardId}`
- `sectionChannelKey(boardId, sectionId)` → `board:{boardId}:section:{sectionId}`
- `assignmentChannelKey(boardId)` → `board:{boardId}:assignment` (AB-1, 2026-04-14)
- `publish(event)` is a no-op placeholder. Consumers MUST use these helpers so a future engine swap touches only the transport layer.
- `AssignmentRealtimeEvent` union: `slot.updated` | `slot.returned` | `reminder.issued`.

## Data model

Relevant subset for Breakout T0-①:

```prisma
model Section {
  id          String  @id @default(cuid())
  boardId     String
  title       String
  order       Int     @default(0)
  accessToken String? @unique  // T0-① Breakout share token
  board Board  @relation(fields: [boardId], references: [id], onDelete: Cascade)
  cards Card[] @relation("SectionCards")
  @@index([boardId])
}
```

Migrations under `prisma/migrations/`:
- `20260412_add_perf_indexes` (earlier task)
- `20260412_add_section_access_token` (this task)

## API surface

| Method | Path | Notes |
|---|---|---|
| POST | `/api/sections` | create section (owner/editor) |
| PATCH | `/api/sections/:id` | edit title/order |
| DELETE | `/api/sections/:id` | delete (cards drop to sectionId=null) |
| **GET** | **`/api/sections/:id/cards?token=…`** | **T0-① section-scoped read. Calls `viewSection`; never scans by boardId.** |
| **POST** | **`/api/sections/:id/share`** | **T0-① owner-only; rotates `Section.accessToken` using `crypto.randomBytes(32).toString("base64url")`.** |
| **GET** | **`/api/boards/:id/stream`** | **2026-04-17 SSE. Polls cards+sections every 3s; emits `event: snapshot` only when sha1 of payload changes. Re-checks `view` permission every 60s. Keepalive `: ping` every 60s during quiet periods. Used by `ColumnsBoard` for live updates.** |

## Routes

| Path | Type | Notes |
|---|---|---|
| `/board/[id]` | server | teacher integrated view (unchanged) |
| **`/board/[id]/s/[sectionId]`** | **server** | **T0-① Breakout view. Scoped card query. Owner sees "공유 관리" link.** |
| **`/board/[id]/s/[sectionId]/share`** | **server** | **T0-① owner-only share page. Renders `<SectionShareClient>` island. 2026-04-13: fallback only (primary entry is BoardHeader ⚙ → `<BoardSettingsPanel>` 브레이크아웃 tab).** |

## Components

- `src/components/SectionBreakoutView.tsx` (server) — renders breadcrumb + `.breakout-grid` of `.column-card`s. Reuses `CardAttachments`.
- `src/components/SectionShareClient.tsx` (client island) — copy + rotate flow. Computes absolute URL post-mount to avoid hydration mismatch.
- `src/components/ui/SidePanel.tsx` (2026-04-13) — generic right-side slide-over dialog primitive. `role=dialog`, `aria-modal`, ESC, focus trap, body scroll lock, opener-focus restore, `prefers-reduced-motion` respected.
- `src/components/SectionActionsPanel.tsx` (2026-04-13, v2 relocation) — columns section management. 2 tabs (`이름 변경` / `삭제`) after the `공유` tab was relocated to the board-level settings panel. Rename calls `PATCH /api/sections/:id`. Delete requires checkbox confirm, calls `DELETE /api/sections/:id`.
- `src/components/BoardSettingsLauncher.tsx` + `src/components/BoardSettingsPanel.tsx` (2026-04-13, board-settings-panel task) — ⚙ button next to `EditableTitle` in `BoardHeader` (owner/editor only) opens a right-slide `SidePanel` titled "보드 설정". Tabs: `브레이크아웃` (per-section generate/rotate/copy, calls `POST /api/sections/:id/share` and `router.refresh()`), plus placeholders `접근 권한`, `Canva 연동`, `테마` ("준비 중"). Consolidated section ⋯ means rename/delete/Canva 액션 모두 `ContextMenu` 하나로 통합됨.
- `src/components/plant/StageDetailSheet.tsx` — refactored 2026-04-13 to wrap `SidePanel` (props unchanged). If `feat/plant-journal-v2` rewrites this file, take v2's version and re-apply the wrapper.

## Design tokens

See `docs/design-system.md`. T0-① Breakout surfaces introduce these utility classes only (no new tokens):
`.breakout-header`, `.breakout-breadcrumb`, `.breakout-grid`, `.breakout-empty`, `.share-panel`, `.share-label`, `.share-url-input`, `.share-actions`, `.share-help`, `.share-status`.

2026-04-13 section-actions-panel adds: `--color-danger`, `--color-danger-active`, and the `.side-panel-*`, `.section-actions-trigger`, `.section-rename-form`, `.section-delete-*` utility classes in `src/styles/side-panel.css`.

2026-04-13 board-settings-panel adds: `.board-settings-trigger`, `.board-settings-tab-meta`, `.board-settings-list`, `.board-settings-row`, `.board-settings-row-title`, `.board-settings-row-name`, `.board-settings-row-badge` (`.on`/`.off`), `.board-settings-empty`, `.board-settings-placeholder` — all in `src/styles/side-panel.css`, reusing existing tokens (no new design tokens). Note: `.section-actions-trigger` is now unused (section ⋯ uses the generic `.ctx-menu-trigger`); the class remains for backward compat until next cleanup.


## 2026-04-13 Drawpile 그림보드 (schema + UI stub, partial scope)

Status: schema + route + UI placeholder only. Drawpile 서버/포크/COOP-COEP/postMessage bridge 는 `BLOCKERS.md` 참조.

### Data model additions
- `StudentAsset` — 학생 소유 이미지(업로드 or Drawpile 생성). `studentId`, 비정규화 `classroomId`, `fileUrl`, `thumbnailUrl`, `format`, `sizeBytes`, `isSharedToClass`, `source` (`upload`|`drawpile`), `drawpileFileId?`. FK: Student cascade.
- `AssetAttachment` — StudentAsset ↔ Card / PlantObservation 조인. 둘 중 하나만 채움. Card/Observation cascade.
- 관계 추가: `Student.assets`, `Card.assetAttachments`(rel `"CardAssetAttachments"`), `PlantObservation.assetAttachments`(rel `"PlantObservationAssetAttachments"`).

### Routes
- `POST /api/student-assets` — 학생 세션 필수. multipart/form-data `file` (image/*, ≤50MB). `public/uploads/` 저장 (기존 `/api/upload` 와 동일 FS 패턴 — 영속성 업그레이드는 BLOCKERS.md #6).
- `GET /api/student-assets?scope=mine|shared[&classroomId=…]` — `mine`: 로그인 학생 본인. `shared`: 교사 owner or 해당 교실 학생.
- `POST /api/student-assets/[id]/attach` — body `{ cardId?, observationId? }`. 자산 owner 또는 board owner 에게만 허용. `cardId` 지정 + `Card.imageUrl === null` 일 때만 imageUrl 채움 (기존 업로드 이미지 보호).

### Layout wiring
- `Board.layout` app-level zod enum 에 `"drawing"` 추가 (`src/app/api/boards/route.ts`).
- `src/app/board/[id]/page.tsx` `LAYOUT_LABEL.drawing = "그림보드"` + `case "drawing"` → `<DrawingBoard />`.
- `CreateBoardModal` LAYOUTS 에 entry 추가.

### Components
- `src/components/DrawingBoard.tsx` — 작업실/갤러리 탭 토글. `NEXT_PUBLIC_DRAWPILE_URL` 있음 → `<iframe sandbox="allow-scripts allow-same-origin allow-forms allow-modals">`. 미설정 → placeholder card (`BLOCKERS.md` 가이드). 갤러리 탭: GET shared + `gallery-empty` 빈 상태.
- `src/components/StudentLibrary.tsx` — 학생 로그인 시에만 사이드바. GET mine + 업로드 버튼 + 썸네일 list.
- `AddCardModal` — `🎨 내 라이브러리` 버튼 + picker overlay. 선택 시 `imageUrl` set + `attachAssetId` 를 `AddCardData` 로 반출. `BoardCanvas.handleAdd` 가 카드 생성 후 fire-and-forget attach 호출.

### Styles
- `src/styles/drawing.css` (globals.css import) — `.drawing-board`, `.drawing-tabs`, `.drawing-panel`, `.drawing-iframe`, `.drawing-placeholder`, `.drawing-gallery`, `.gallery-thumb`, `.drawing-sidebar`, `.library-list`, `.library-picker*`. 768px breakpoint 에서 세로 스택.

### Migrations
- `prisma/migrations/20260413_add_drawpile_student_assets/migration.sql` (non-destructive). Supabase 수동 적용 필요 (`BLOCKERS.md` #5).

### Deferred (BLOCKERS.md)
1. Drawpile fork repo (GPL 격리)
2. Drawpile 서버 호스팅 + `drawpile.aura-board.app`
3. COOP/COEP 헤더 (drawing-only 라우트 전략)
4. postMessage bridge (`docs/drawpile-protocol.md`)
5. Supabase migration 적용
6. 프로덕션 스토리지 업그레이드 (`@vercel/blob` 등)

## Breakout Room Foundation (2026-04-12, BR-1 ~ BR-4)

### Data model
```prisma
model BreakoutTemplate {
  id, key (unique), name, description,
  tier ("free"|"pro"), requiresPro,
  scope ("system"|"teacher"|"school"), ownerId?,
  structure Json,             // {sectionsPerGroup:[{title,role,defaultCards?}], sharedSections?:[{title,role:"teacher-pool"}]}
  recommendedVisibility ("own-only"|"peek-others"),
  defaultGroupCount, defaultGroupCapacity
}

model BreakoutAssignment {
  id, boardId (unique), templateId,
  deployMode ("link-fixed"|"self-select"|"teacher-assign"),
  groupCount, groupCapacity, visibilityOverride?,
  status ("active"|"archived")
}

model BreakoutMembership {
  id, assignmentId, sectionId, studentId, role? ("expert"|"home"|null), joinedAt
  @@unique([sectionId, studentId])
}
```

관계 필드:
- `User.templatesOwned BreakoutTemplate[]` (`TemplateOwner`)
- `Section.breakoutMemberships BreakoutMembership[]`
- `Student.breakoutMemberships BreakoutMembership[]`
- `Board.breakoutAssignment BreakoutAssignment?`

### API
- `POST /api/boards` — `layout="breakout"` + `breakoutConfig` 시 단일 트랜잭션에서 Board + Assignment + N*S group sections + (sharedSections 있으면) teacher-pool section + defaultCards deep-clone 생성. Tier gating: `requiresPro && tier==="free"` → 403.
- `GET /api/breakout/templates` — 시스템 + 교사 커스텀 (ownerId 일치) 리스트.
- `POST /api/breakout/assignments/[id]/copy-card` — teacher(owner)-only, body `{sourceCardId}` → teacher-pool 제외 + origin section 제외 group section 전체에 독립 복사 INSERT.

### Components
- `src/components/CreateBreakoutBoardModal.tsx` — 3-step (template → config → confirm). Pro 템플릿은 Free 사용자에게 aria-disabled + 🔒 배지.
- `src/components/BreakoutBoard.tsx` — 교사 풀뷰. `parseGroupSection()` 으로 "모둠 N · 섹션명" 포맷 역파싱. teacher-pool 섹션은 상단 밴드 분리. 카드 ContextMenu에 🧬 "모든 모둠에 복제".
- `src/components/CreateBoardModal.tsx` — LAYOUTS에 `{id:"breakout", emoji:"👥"}` 추가 + `step="breakout"` 분기 → CreateBreakoutBoardModal 오픈.
- `src/app/board/[id]/page.tsx` — `case "breakout"` 렌더 분기 (BreakoutAssignment + template include 로딩).

### Libraries
- `src/lib/breakout.ts` — `TemplateStructureSchema` (zod), `cloneStructure()` (deep-clone 분리), `BreakoutConfigSchema`, `groupSectionTitle()`.
- `src/lib/tier.ts` — `getCurrentTier()` / `canUseTemplate()` stub. `process.env.TIER_MODE` 우선. BR-5~9에서 User.tier 필드로 교체.

### Seed
- `prisma/seed-breakout-templates.ts` — 8종 upsert(idempotent). `npm run seed:breakout`.

### Student 격리 뷰
- T0-① `/board/[id]/s/[sectionId]` 재사용. `Section.accessToken` 재마이그레이션 금지.
- BR-5에서 deployMode 별 진입 URL(token 포함) 배포 예정.

### Deferred → BR-5 ~ BR-9
- ~Deploy runtime~ — BR-5 완료
- ~Visibility WS gating~ — BR-6 완료
- ~Teacher assignment UI~ — BR-7 완료
- ~Student 명단 CSV import~ — BR-8 완료
- ~분석/통계~ — BR-9 완료

## Breakout Room Runtime (2026-04-12, BR-5 ~ BR-9)

### APIs
- `PATCH /api/breakout/assignments/[id]` — owner, body `{deployMode?, visibilityOverride?, groupCapacity?, status?}` (zod 검증)
- `POST /api/breakout/assignments/[id]/membership` — 학생 self-insert 또는 교사 대리. 정원 check + @@unique → 400/409. self-select 모드는 2회차 시도 시 409 `already_selected`.
- `PATCH /api/breakout/assignments/[id]/membership/[mid]` — owner, 섹션 이동 + 정원 check
- `DELETE /api/breakout/assignments/[id]/membership/[mid]` — owner
- `GET /api/breakout/assignments/[id]/my-access` — 호출자(teacher/student) 기준 허용 섹션 id + realtime 채널 key 리스트 반환 (`boardChannelKey` / `sectionChannelKey`)
- `POST /api/breakout/assignments/[id]/roster-import` — owner, multipart `file=<csv>` (name/number 헤더), Student upsert, 반환 `{created, existing, failed}`

### RBAC
- `src/lib/rbac.ts#assertBreakoutVisibility({sectionId, boardId, userId?, studentId?, token?})` — breakout 보드일 경우 추가 가드. 교사/매치 토큰은 통과, 학생은 own-only(자기 멤버십 sectionId) / peek-others(모든 group section) / teacher-pool(상시 허용).
- `src/lib/rbac.ts#maybeAutoJoinLinkFixed({assignmentId, sectionId, studentId})` — link-fixed 모드 한정 멱등 upsert. 정원 초과 시 `capacity_reached`.
- 섹션 진입점 (`/board/[id]/s/[sectionId]`, `/api/sections/[id]/cards`) 모두 viewSection → assertBreakoutVisibility 순서 호출.

### Pages / Components
- `src/app/b/[slug]/select/page.tsx` — 학생 self-select 그리드 + 정원 표시
- `src/app/board/[id]/archive/page.tsx` — 교사 전용 읽기 전용 모둠별 요약 테이블 + 최종 카드 스냅샷
- `src/components/BreakoutSelectClient.tsx` — 선택 버튼 + 409/정원초과 에러 메시지
- `src/components/BreakoutAssignmentManager.tsx` — 교사 대시보드 모달: 미배정 학생 리스트, 모둠별 배정/이동/제거, link-fixed 링크 복사, CSV 업로드
- `src/components/BreakoutBoard.tsx` — "배정 관리" / "세션 종료" / "아카이브" 툴바 + 모둠별 멤버 리스트 + 정체 경고 + deploy-mode/visibility 배지
- `src/components/SectionBreakoutView.tsx` — `autoJoinWarning` prop (link-fixed capacity_reached 경고)

### 배포 모드 동작 요약
| 모드 | 진입 경로 | 멤버십 생성 시점 |
|---|---|---|
| link-fixed | 교사가 배포한 `/board/[id]/s/[sectionId]?t=<token>` | 섹션 방문 시 auto-upsert |
| self-select | 교사가 공유한 `/b/[slug]/select` | 학생 클릭 1회 |
| teacher-assign | 교사가 드래그/버튼 배정 | 교사 액션 즉시 |

### 가시성 모드 요약
| 모드 | 학생 접근 |
|---|---|
| own-only | 본인 membership.sectionId + teacher-pool 섹션만 |
| peek-others | 전체 group section + teacher-pool |
| teacher | 항상 full (owner/editor) |
- 실제 Tier 결제 모델 (User.tier 필드)

## Assignment board (AB-1) — 2026-04-14

**Entity**: `AssignmentSlot` (roster-bound, 1 row per student at creation). See `tasks/2026-04-14-assignment-board-impl/phase3/data_model.md` for the full DSL.

**State machine** (`src/lib/assignment-state.ts` — 24 unit tests):

```
submissionStatus: assigned → submitted → viewed → {returned,reviewed} ; any → orphaned
gradingStatus:    not_graded → {graded, released}  (resets to not_graded on returned)
```

**API surface**:

| Method | Path | Role |
|---|---|---|
| POST | `/api/boards` `layout=assignment` | teacher |
| GET | `/api/boards/[id]/assignment-slots` | teacher (all) / student (own 1) / parent (scope) |
| PATCH | `/api/assignment-slots/[id]` | teacher — `{transition: open|return|review|grade}` |
| POST | `/api/assignment-slots/[id]/submission` | student — `canStudentSubmit()` gated |
| POST | `/api/boards/[id]/reminder` | teacher — 5-min per-board cooldown |
| POST | `/api/boards/[id]/roster-sync` | teacher — add new students post-creation |

**RBAC**: 3-layer (API guard + DOM filter at server component + RLS scaffold `prisma/migrations/20260414_add_assignment_slot/rls.sql` NOT auto-applied).

**Perf budget** (Galaxy Tab S6 Lite — AC-14, measurement pending hardware): DOM ≤ 180, TTI ≤ 3s, scroll FPS ≥ 45. Design: `memo(AssignmentGridView)`, CSS grid layout, `loading="lazy"` 160×120 img, no realtime subscription loops.

**Deferred**: WebP thumbnail pipeline (sharp), Matrix view server guard (`?view=matrix`).

## DJ Board (dj-queue) — 2026-04-18

Spotify-style sequential YouTube queue + **classroom role system** foundation. 사서/은행원 등 향후 역할로 일반화되는 data-driven RBAC.

### Data model additions

3 new models (`ClassroomRoleDef`, `BoardLayoutRoleGrant`, `ClassroomRoleAssignment`) + 1 new column (`Card.queueStatus`). Additive migration `20260418_dj_board_role_grants` with idempotent seed (dj role + (dj, dj-queue)→owner grant).

### RBAC extension

`src/lib/rbac.ts` → **`getEffectiveBoardRole(boardId, {userId?, studentId?})`** 신규.

Precedence:
1. userId → `getBoardRole` (기존 BoardMember 경로) — teacher always wins
2. studentId + student.classroomId === board.classroomId → `BoardLayoutRoleGrant` JOIN `ClassroomRoleAssignment` → grantedRole OR viewer fallback
3. 그 외 → null

기존 `getBoardRole` / `requirePermission` (17개 legacy callers) 불변. 신규 함수는 DJ queue API + SSE stream + board page role 해석에서만 사용.

### API surface

신규: `POST/PATCH/DELETE /api/boards/:id/queue[/:cardId[/move]]`, `GET/POST/DELETE /api/classrooms/:id/roles[/assign[/:id]]`.
수정: `POST /api/boards` (layout +dj-queue, classroomId required), `GET /api/boards/:id/stream` (student session + CardWire.queueStatus).

### YouTube validation (src/lib/youtube.ts)

- Host allowlist: `youtube.com` / `www.youtube.com` / `m.youtube.com` / `youtu.be`
- URL patterns: `/watch?v=<11-char>`, `/shorts/<11-char>`, `youtu.be/<11-char>`
- oEmbed fetch with 24h Next.js cache. 실패 시 400 반환.

### Components

`DJBoard` shell + `dj/{DJNowPlayingHeader, DJQueueList, DJQueueItem, DJSubmitForm, DJEmptyState}`. 교사용 `classroom/ClassroomDJRolePanel`. `CardData`에 `queueStatus?: string | null` 추가. `CreateBoardModal.LAYOUTS`에 `dj-queue` 항목. `/board/[id]/page.tsx` switch에 `case "dj-queue"` 추가. `/classroom/[id]/page.tsx` 하단에 DJ 패널 plug-in.

### Extensibility

새 역할-보드 쌍 추가는 **DB row 2개**로:
```sql
INSERT INTO "ClassroomRoleDef" (id, key, labelKo, emoji) VALUES (cuid(), 'librarian', '사서', '📚');
INSERT INTO "BoardLayoutRoleGrant" (id, classroomRoleId, boardLayout, grantedRole)
VALUES (cuid(), (SELECT id FROM "ClassroomRoleDef" WHERE key='librarian'), 'librarian-shelf', 'editor');
```

**Deferred**: 실제 YouTube iframe 동기 재생 (WebRTC), 투표 기반 우선순위, 범용 역할 관리 패널, 키보드 드래그 a11y.

## Classroom Bank (2026-04-19)

학급 경제 시뮬레이션: 통장 · 체크카드 · 30일 만기 적금 · 매점 카드 결제. 기존 classroom-role 시스템에 `banker`, `store-clerk` 역할 추가 + 교사 편집 가능한 권한 매트릭스.

### IA
`/classroom/:id` → `/classroom/:id/students` 리다이렉트. 상단 `ClassroomNav`: `/students /boards /roles /bank /store /pay`. 학생용 `/my/wallet`.

### Data model (7 new)
`ClassroomCurrency`, `StudentAccount`, `StudentCard`, `StoreItem`, `FixedDeposit`, `Transaction` (balanceAfter 감사 체인), `ClassroomRolePermission`. Migration `20260419_classroom_bank` + banker/store-clerk seed.

### Libs
- `src/lib/bank-permissions.ts` — PERMISSION_CATALOG 6 keys + `hasPermission` (teacher win → explicit override → default catalog)
- `src/lib/qr-token.ts` — HMAC 60s tokens + 15min nonce cache
- `src/lib/bank.ts` — `ensureAccountFor` / `ensureClassroomCurrency` lazy

### API (14 new)
bank {deposit, withdraw, fixed-deposits [open/cancel], overview}; store {items CRUD, charge}; role-permissions {GET, PUT per-role}; currency PATCH; my/wallet {GET, card-qr}; cron/fd-maturity.

### Concurrency
잔액 mutation 전부 `db.$transaction` 내부에서 findUnique → check → update → Transaction.create. Prisma READ COMMITTED 기본. phase8 security_audit.md 참조.

### Cron
`vercel.json` `/api/cron/fd-maturity` @ `5 15 * * *` UTC (00:05 KST). CRON_SECRET bearer 인증.

**Deferred**: 카메라 QR 스캐너 lib, Redis nonce, 학생 간 이체, Apple/Google Wallet Pass, 3분할 지갑.
