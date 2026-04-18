# Phase 6 — Design Review

## PASS — variant B approved

### Checks

- [x] No new design tokens
- [x] Reuses existing class names (`.card-attach-image`, `.plant-obs-imgs`, etc.)
- [x] Placeholder uses `--color-bg-subtle`
- [x] Error copy in Korean, matches app voice ("이미지를 불러올 수 없어요")
- [x] Container-fill approach keeps layout stable (no CLS)
- [x] Lightbox treatment preserves user expectation (full-quality view)

## Notes for coder

- Do NOT introduce new radii — inherit from parent container.
- QR image in `ClassroomDetail.tsx` stays `<img>` (data URL). Annotate with comment.
- When `unoptimized` is set, `next/image` skips `_next/image` — still gets lazy + srcset behaviors we care about.
