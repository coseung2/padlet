# Phase 1 — Research

## Current state (as-is)

Raw `<img>` usage across 9 files; no responsive srcset, no Next.js Image Optimization, no lazy loading outside a few hand-set `loading="lazy"` hints.

Hit list (from `git grep '<img '` at HEAD=9676013):

1. `src/components/CardAttachments.tsx` — card image (L43), link preview (L83, L144, L166), canva thumbnail (L166)
2. `src/components/CanvaFolderModal.tsx` — folder design thumbnail (L176)
3. `src/components/ExportModal.tsx` — export thumbnail (L188)
4. `src/components/AddCardModal.tsx` — upload preview (L166), link preview (L217)
5. `src/components/EditCardModal.tsx` — upload preview (L127)
6. `src/components/ClassroomDetail.tsx` — QR thumb (L427)
7. `src/components/plant/TeacherMatrixView.tsx` — lightbox (L194)
8. `src/components/plant/RoadmapView.tsx` — obs photo (L313), lightbox (L425)
9. `src/components/plant/StageDetailSheet.tsx` — obs photo (L99)
10. `src/components/plant/ObservationEditor.tsx` — upload thumb (L135)

## External image hosts observed

- Canva oEmbed thumbnail: `document-export.canva.com` / `www.canva.com` / various `*.canva-web-files.com` — dynamic
- Plant observation images: uploaded to `/uploads/...` (same origin)
- Uploaded card media: same origin `/uploads/...`
- QR codes: data-URL (base64), same-origin

## Next.js Image Optimization mechanics

- `next/image` serves `/_next/image?url=...&w=...&q=...` with `srcset` auto-generated from `deviceSizes`/`imageSizes`.
- Remote hosts must be whitelisted in `images.remotePatterns`.
- Vercel runs the Image Optimization at the edge — original never crosses the wire at full resolution.
- For same-origin `/uploads/*`, `next/image` optimizes them too.

## Perf target (Galaxy Tab S6 Lite)

- Viewport: ~1500×2000 CSS, DPR 2 → physical 3000×4000.
- Card grid typically shows 2–3 columns → each card image slot ≈ 480–600 CSS px wide → DPR 2 → 960–1200 physical px.
- `sizes="(max-width: 768px) 100vw, 480px"` produces ~480w/960w/1200w srcset variants.
- Budget: ≤ 300 KB per card image, ≤ 2 s time-to-first-image on 3G throttled.

## Constraints

- NO destructive prisma.
- No direct touch of `DraggableCard.tsx` header (coordination with T0-② iframe work). Stay inside `CardAttachments`.
- Design tokens only — no new colors/radii introduced; reuse existing CSS classes.
