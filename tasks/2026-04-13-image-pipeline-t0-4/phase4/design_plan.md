# Phase 4 — Design Plan (lightweight)

## Treatment

- **Container-driven sizing**: all image slots already have CSS constraints (`.card-attach-image`, `.card-link-preview-image`, `.plant-obs-imgs img`, etc.). `OptimizedImage` uses `fill` to inherit these.
- **Placeholder**: `background: var(--color-bg-subtle, #f5f5f5)` applied to parent while image loads. No blur placeholder (no build-time access to remote image for `blurDataURL`).
- **Error fallback**: small muted `<div className="optimized-img-error">이미지를 불러올 수 없어요</div>` (Korean, matches app copy).
- **Lightbox**: uses `OptimizedImage priority fill` inside existing `.plant-lightbox` overlay.

## No new UI chrome

No new borders, radii, or shadows. All visible surfaces reuse existing class names.

## CSS additions (minimal)

```css
.optimized-img-error {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--color-bg-subtle, #f5f5f5);
  color: var(--color-text-muted, #888);
  font-size: 0.875rem;
}
.optimized-img-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--color-bg-subtle, #f5f5f5);
}
```

These tokens already exist in `globals.css`. No new design tokens introduced.
