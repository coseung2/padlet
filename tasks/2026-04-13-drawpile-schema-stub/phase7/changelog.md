# Phase 7 — Implementation Changelog

## Files added
- `prisma/migrations/20260413_add_drawpile_student_assets/migration.sql`
- `src/app/api/student-assets/route.ts`
- `src/app/api/student-assets/[id]/attach/route.ts`
- `src/components/DrawingBoard.tsx`
- `src/components/StudentLibrary.tsx`
- `src/styles/drawing.css`
- `docs/drawpile-protocol.md`
- `BLOCKERS.md`

## Files modified
- `prisma/schema.prisma` — StudentAsset, AssetAttachment, relations on Student/Card/PlantObservation
- `src/app/api/boards/route.ts` — zod enum +drawing
- `src/components/CreateBoardModal.tsx` — LAYOUTS entry +drawing
- `src/app/board/[id]/page.tsx` — LAYOUT_LABEL, switch case, skip-cards flag
- `src/components/AddCardModal.tsx` — 내 라이브러리 버튼 + picker overlay + attachAssetId
- `src/components/BoardCanvas.tsx` — fire-and-forget attach call
- `src/app/globals.css` — drawing.css import

## Verification
- `npx prisma validate` (with placeholder env): schema is valid
- `npx prisma generate`: client generated, new models exposed
- `npx tsc --noEmit`: 0 errors
- `npm run build`: success, /api/student-assets and /api/student-assets/[id]/attach listed in route table
- Drawpile URL unset path: DrawingBoard renders placeholder (verified at build time — import tree includes both branches)
