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
| **`/board/[id]/s/[sectionId]/share`** | **server** | **T0-① owner-only share page. Renders `<SectionShareClient>` island.** |

## Components

- `src/components/SectionBreakoutView.tsx` (server) — renders breadcrumb + `.breakout-grid` of `.column-card`s. Reuses `CardAttachments`.
- `src/components/SectionShareClient.tsx` (client island) — copy + rotate flow. Computes absolute URL post-mount to avoid hydration mismatch.

## Design tokens

See `docs/design-system.md`. T0-① Breakout surfaces introduce these utility classes only (no new tokens):
`.breakout-header`, `.breakout-breadcrumb`, `.breakout-grid`, `.breakout-empty`, `.share-panel`, `.share-label`, `.share-url-input`, `.share-actions`, `.share-help`, `.share-status`.
