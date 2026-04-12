# Diff Summary — breakout-section-isolation

## Schema + migration
- `prisma/schema.prisma`: added `Section.accessToken String? @unique` with inline comment.
- `prisma/migrations/20260412_add_section_access_token/migration.sql`: `ALTER TABLE … ADD COLUMN` + unique index. PostgreSQL allows multiple NULLs so no partial index.

## Lib
- `src/lib/realtime.ts` (new): `boardChannelKey`, `sectionChannelKey` helpers + no-op `publish()` placeholder. Comment flags that engine adoption is deferred.
- `src/lib/rbac.ts`: added `viewSection(sectionId, ctx)` returning the resolved section or throwing `ForbiddenError`. Existing `getBoardRole` / `requirePermission` unchanged (backward compatible).

## API
- `src/app/api/sections/[id]/cards/route.ts` (new): `GET` with `?token=` query. Parallel auth resolve (user + student), then `viewSection` gate, then `db.card.findMany({ where: { sectionId } })` — never queries by boardId.
- `src/app/api/sections/[id]/share/route.ts` (new): `POST` owner-only (not editor). Uses `crypto.randomBytes(32).toString("base64url")` (43 chars when stripped padding, >32).

## Routes
- `src/app/board/[id]/s/[sectionId]/page.tsx` (new): server component. Resolves board by id-or-slug (same as existing `/board/[id]`), gates via `viewSection`, renders `<SectionBreakoutView>` with ONLY section-scoped cards. Owner sees a "공유 관리" link. Cross-board sectionId hit → notFound (defence-in-depth).
- `src/app/board/[id]/s/[sectionId]/share/page.tsx` (new): server page that owner-gates then renders `<SectionShareClient>`.

## Components
- `src/components/SectionBreakoutView.tsx` (new): server component. Reuses `.column-card`, `.board-header`, `CardAttachments`. New CSS classes: `.breakout-header`, `.breakout-breadcrumb`, `.breakout-grid`, `.breakout-empty`.
- `src/components/SectionShareClient.tsx` (new): `"use client"` island with copy/rotate flow. Builds absolute URL from `window.location.origin` on the client (no function serialization across the boundary).

## Styles
- `src/styles/breakout.css` (new): all Breakout + share styles. Design-system tokens only; no hard-coded hex. Responsive `.share-actions { flex-wrap: wrap }` per phase6 review guidance.
- `src/app/globals.css`: import added before `responsive.css` so responsive overrides still win.

## Tests
- `src/lib/__tests__/realtime.test.ts`: 6 cases — basic shape + blank-argument rejection.

## Out of scope (deferred)
- Realtime pub/sub engine selection.
- `/api/cards` write endpoints being section-scoped (MVP Breakout is read-only for students).
- Token-expiry or usage caps.
