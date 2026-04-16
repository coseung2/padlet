# Phase 5 — Design Spec (selected variant)

## Variant: "Container-fill with token-based skeleton"

Chosen from shotgun:
- ~~A. Fixed width/height with explicit intrinsic size~~ (rejected: requires per-slot code churn)
- **B. `fill` mode with CSS parent sizing** ✅
- ~~C. Aspect-ratio wrappers with intrinsic ratio hints~~ (rejected: too many surface changes)
- ~~D. Blur placeholder per remote host~~ (rejected: no build-time image access)

## Rationale

Variant B touches the least code, respects existing layout, and gets us responsive srcset + lazy for free. The skeleton background uses existing `--color-bg-subtle`.

## Spec

- Default `sizes="(max-width: 768px) 100vw, 480px"` — matches typical card slot width (480 CSS px at tablet).
- Lightbox: `sizes="90vw"`, `priority` true.
- Plant thumbnail grid: `sizes="(max-width: 768px) 33vw, 160px"`.
- Link preview image: `sizes="(max-width: 768px) 40vw, 120px"`.
- Upload preview in modal: explicit `width={320} height={240}`.
