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
- `publish(event)` is a no-op placeholder. Consumers MUST use these helpers so a future engine swap touches only the transport layer.

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
- Deploy runtime (link-fixed/self-select/teacher-assign)
- Visibility WS gating (own-only/peek-others)
- Teacher assignment UI (drag-assign)
- Student 명단 CSV import
- 분석/통계
- 실제 Tier 결제 모델 (User.tier 필드)
