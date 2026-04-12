# Phase 11 — Documentation Updates

## Files touched (this phase only)

None yet — documentation diffs staged below for reviewer to cherry-pick into main docs post-merge.

## `docs/architecture.md` stub (to apply after merge)

Add under "Components":

> `src/components/ui/OptimizedImage.tsx` — shared wrapper over `next/image`. All card/thumbnail/lightbox images flow through this. Handles data-URI passthrough, error fallback, and responsive srcset.

Add under "API Routes":

> `GET /api/canva/thumbnail?url=...&w={160|320|640}` — size-gated Canva thumbnail proxy. Rejects originals (requests without `w` or with `w` outside the allowlist → 400). Same-origin tunnel for Next.js Image Optimizer to consume.

## `docs/current-features.md` stub

> **Image pipeline (T0-④)**: responsive lazy images via `next/image` on every card/thumb/lightbox; size-gated Canva thumbnail proxy.

## `docs/design-system.md` stub

> Add `.optimized-img-wrap` pattern — used as the parent container for any `<OptimizedImage>` in fill mode. Provides position:relative + skeleton background using `--color-bg`.

## `CLAUDE.md`

No changes — no new paths/env.

## `README.md`

No user-facing changes required.
