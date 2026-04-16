# Phase 7 — Coder: Coordination Notes

## DraggableCard.tsx — NOT TOUCHED

T0-② (iframe virtualization) is known to rewrite `DraggableCard.tsx` heavily. We deliberately kept this file untouched to avoid merge conflicts. All image swaps live inside `CardAttachments.tsx` (which DraggableCard composes), so T0-② still owns the card shell.

## Files changed

New files:
- `src/components/ui/OptimizedImage.tsx` — shared wrapper over `next/image`
- `src/app/api/canva/thumbnail/route.ts` — size-gated thumbnail proxy
- `src/styles/optimized-image.css` — layout glue for fill-mode parents

Modified:
- `next.config.ts` — `images.remotePatterns`, `deviceSizes`, `imageSizes`, `formats`
- `src/app/globals.css` — import optimized-image.css
- `src/components/CardAttachments.tsx` — 4 `<img>` → `OptimizedImage`
- `src/components/AddCardModal.tsx` — 2 sites
- `src/components/EditCardModal.tsx` — 1 site
- `src/components/CanvaFolderModal.tsx` — 1 site
- `src/components/ExportModal.tsx` — 1 site
- `src/components/ClassroomDetail.tsx` — QR kept as `<img>` with explanatory comment
- `src/components/plant/TeacherMatrixView.tsx` — lightbox
- `src/components/plant/RoadmapView.tsx` — thumb + lightbox
- `src/components/plant/StageDetailSheet.tsx` — thumb
- `src/components/plant/ObservationEditor.tsx` — thumb

## Conflict surface with other agents

- `feat/board-settings-panel` — NONE (header only)
- `feat/iframe-virtualization-t0-2` — SHARES `CardAttachments.tsx` (image slot only). Merge resolution: prefer their iframe logic, keep our `<OptimizedImage>` JSX.

## Behavior diff

- Below-the-fold card images: no network until scrolled into viewport (`loading="lazy"` on `next/image` by default).
- Above-the-fold/modal hero images: `priority` set on plant lightbox — immediate fetch.
- Data-URI images (QR, inline SVG): OptimizedImage auto-detects and passes `unoptimized`.
- `/api/canva/thumbnail` rejects any request missing `w` or with `w` outside {160, 320, 640} with HTTP 400.
