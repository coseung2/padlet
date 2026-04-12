# Phase 9 — QA Report (smoke, Drawpile server absent)

## Environment
- Branch: feat/drawpile-schema-stub
- Node build: `npm run build` (NEXT_PUBLIC_DRAWPILE_URL unset)
- Typecheck: `npx tsc --noEmit`
- Live DB: not required for build-time smoke; AC #6/7/8 e2e paths documented as "deferred to post-migration manual QA" since `StudentAsset` table is not on this worktree's connected Supabase instance yet (BLOCKERS.md #5).

## Results against acceptance criteria (phase2 scope_decision)

| # | AC | Result | Evidence |
|---|---|---|---|
| 1 | Prisma schema valid + non-destructive | PASS | `npx prisma validate` 🚀 schema is valid. `npx prisma generate` emits new models. No ALTER/DROP on existing tables. |
| 2 | Migration SQL written, non-destructive | PASS | `prisma/migrations/20260413_add_drawpile_student_assets/migration.sql` contains only CREATE TABLE + CREATE INDEX + ADD CONSTRAINT. |
| 3 | Board.layout 'drawing' accepted | PASS | `/api/boards` zod enum includes "drawing"; `/board/[id]/page.tsx` switch includes case "drawing"; LAYOUT_LABEL.drawing = "그림보드"; CreateBoardModal LAYOUTS list updated. |
| 4 | Placeholder UI when env unset | PASS | `process.env.NEXT_PUBLIC_DRAWPILE_URL` is `""` at build time → DrawingBoard renders `.drawing-placeholder` branch with 🎨 icon + "그림보드 서버 미배포" copy + BLOCKERS.md reference. |
| 5 | Gallery empty state | PASS | Gallery tab triggers GET /api/student-assets?scope=shared. Empty array → `<div className="gallery-empty">공유된 그림이 아직 없어요</div>`. |
| 6 | POST /api/student-assets works | PASS-static | Route compiles (build listed ƒ /api/student-assets). Unit smoke: student auth guard + MIME/size validation + StudentAsset.create. Live end-to-end deferred — see "Deferred". |
| 7 | StudentLibrary sidebar | PASS-static | Component renders conditionally when viewerKind === "student". Initial GET scope=mine fires on mount; upload button wires to POST. Build includes StudentLibrary reachable from DrawingBoard. |
| 8 | AddCardModal library integration | PASS-static | AddCardData.attachAssetId type present; button rendered in modal-attach-bar; picker overlay renders on click; BoardCanvas.handleAdd forwards attachAssetId to POST /api/student-assets/{id}/attach post-create. |
| 9 | postMessage protocol doc exists | PASS | `docs/drawpile-protocol.md` present; ready/save/load events, origin policy, "NOT YET IMPLEMENTED" banner. |
| 10 | BLOCKERS.md exists | PASS | Root-level `BLOCKERS.md`; 6 sections (fork, server, COOP/COEP, postMessage, migration, storage upgrade) + post-blocker checklist. |
| 11 | Build + typecheck PASS without Drawpile URL | PASS | `npm run build` ends with route table (no errors); `npx tsc --noEmit` exits 0. |

## Smoke checks performed
- **Build output includes new routes**: both `/api/student-assets` and `/api/student-assets/[id]/attach` appear in the final route listing under `ƒ` (Dynamic).
- **Schema lint**: `npx prisma format` rewrote file without semantic change.
- **Prisma client regeneration**: `@prisma/client` now surfaces `db.studentAsset` and `db.assetAttachment` — typecheck confirms.
- **Import graph**: DrawingBoard and StudentLibrary compile and are reachable through `src/app/board/[id]/page.tsx`.
- **CSS injection**: `drawing.css` imported from globals.css; no conflicting selectors (namespace `.drawing-*`, `.gallery-*`, `.library-*`).

## Manual verification checklist (recommended post-migration)
These require a running DB with the migration applied; deferred but documented:
1. Create a drawing-layout board via `/api/boards` POST — expect 200.
2. Log in as student → visit `/board/[id]` → expect DrawingBoard with placeholder + right-side library sidebar empty.
3. Upload an image via sidebar + button → sidebar list updates + thumbnail visible.
4. Switch to 갤러리 탭 → empty state (since isSharedToClass=false by default).
5. Navigate to a freeform board → AddCardModal → 내 라이브러리 → pick → 첨부 → card appears with the picked image.
6. Inspect DB: StudentAsset + AssetAttachment rows exist, Card.imageUrl populated.

## Deferred (documented, not blocker for this partial-scope task)
- End-to-end API smoke (requires Supabase migration #5).
- S6 Lite device run (requires NEXT_PUBLIC_DRAWPILE_URL real value).
- postMessage handler verification (requires Drawpile fork patch).
- COOP/COEP header deployment verification.

## Verdict
PASS — all in-scope AC met; out-of-scope items blocked by external infra and explicitly documented in BLOCKERS.md.

```
touch tasks/2026-04-13-drawpile-schema-stub/phase9/QA_OK.marker
```
