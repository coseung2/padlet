# Phase 8 — Code Review

## Self-review checklist

- [x] No destructive prisma commands
- [x] No `DraggableCard.tsx` changes (coordination with T0-②)
- [x] No port 4000 touches
- [x] Only design tokens used (`--color-bg`, `--color-text-muted`, `--color-border`)
- [x] No new hardcoded colors
- [x] TypeScript strict passes (`npm run typecheck` clean)
- [x] Build passes (`npm run build` — route `/api/canva/thumbnail` registered, 31/31 static pages)
- [x] `git grep '<img '` reduced to 1 intentional site (QR data URL) with explanatory comment + eslint disable
- [x] OptimizedImage handles error state (fallback `<div>` renders Korean copy)
- [x] Data-URI auto-detection prevents broken optimization attempts on QR/SVG
- [x] `/api/canva/thumbnail` validates host + width + protocol; refuses originals
- [x] CSS: no new tokens, only fallback values for missing ones
- [x] A11y: lightbox images have `role="dialog"` parent; thumb wrappers have `role="button"` + keyboard handlers
- [x] Lightbox uses `priority` to avoid loading delay on user-triggered modal open

## Known residuals / accepted debt

- `<img>` in `ClassroomDetail.tsx` for QR codes — by design (data: URL, same origin, tiny)
- `/api/canva/thumbnail` does not actually resize on the server — it streams upstream bytes. Next.js Image Optimization (via `next/image`) downstream handles the resize. This is by design: we don't want to ship `sharp` to the serverless bundle for this alone.

## REVIEW_OK

All checks green.
