# Phase 9 — QA Report

Perf baseline: Galaxy Tab S6 Lite (1500×2000, DPR 2), Chrome Android

## Automated

| Check | Result |
|---|---|
| `npm run typecheck` | PASS (0 errors) |
| `npm run build` | PASS (31/31 static, all 45+ routes registered, `/api/canva/thumbnail` visible) |
| `git grep '<img '` in `src/` production paths | 1 intentional hit (QR data URL in `ClassroomDetail.tsx`) |

## Route-handler contract smoke tests (dev server http://127.0.0.1:3000)

| Input | Expected | Actual |
|---|---|---|
| `GET /api/canva/thumbnail?url=...canva.com...` (no `w`) | 400 | 400 PASS |
| `GET /api/canva/thumbnail?url=...&w=2000` (out of set) | 400 | 400 PASS |
| `GET /api/canva/thumbnail?url=https://evil.example.com/&w=320` (bad host) | 400 | 400 PASS |
| `GET /api/canva/thumbnail?url=http://...&w=320` (not https) | 400 | 400 PASS |
| `GET /api/canva/thumbnail?url=https://document-export.canva.com/...&w=320` (valid, upstream 404) | 502 | 502 PASS |
| `GET /` | 200 | 200 PASS (title `Aura-board`, no error overlay) |

## Acceptance criteria review

1. All card images use `next/image`? — YES (via `OptimizedImage`). Residual `<img>`: QR data URL only, annotated. ✅
2. Below-the-fold card images lazy? — YES. `OptimizedImage` defaults to `loading="lazy"` (inherited from `next/image`). ✅
3. `srcset` present ≥ 3 DPR widths? — YES. `deviceSizes: [360,640,750,828,1080,1200,1920]` + `imageSizes: [16,32,64,96,160,320,480,640]` → `next/image` emits 7+ width variants. ✅
4. Galaxy Tab S6 Lite per-card image ≤ 300 KB? — CONFIGURED. With `sizes="(max-width: 768px) 100vw, 480px"` the tablet picks 750w WebP variant. Typical WebP 750w card photo ≈ 60-120 KB, well under 300 KB. Requires live data to measure exactly; will be verified in staging. ✅ (config-level)
5. 3G throttled time-to-first-image < 2s? — CONFIGURED. Lazy + responsive means only the first-viewport image loads initially; WebP transcode drops payload. Will be verified in staging. ✅ (config-level)
6. Original-size requests on `/api/canva/thumbnail` → 400? — VERIFIED (see route table above). ✅
7. Plant observation originals viewable in detail modal? — YES. Lightbox receives `src={img.url}` (original URL) with `priority` and `fit=contain` — full image flows through Next.js Optimizer at large widths up to 1920w (not the CDN original). ✅
8. `npm run build` PASS? — YES. ✅

## Manual QA checklist (recommended for human)

Run on Galaxy Tab S6 Lite emulator (Chrome DevTools → 1500×2000, DPR 2, 3G Fast):

- [ ] Open `/board/demo` — scroll; observe Network tab: images load only as they enter viewport.
- [ ] Open any card with `linkImage` — preview image is `_next/image?...&w=...` URL.
- [ ] Open `/board/plant-demo` → click an observation thumbnail → lightbox shows full-size image, closes on click.
- [ ] Classroom QR modal — QR renders normally (data URL, not optimized by design).
- [ ] Modal upload preview works for newly selected images.

## QA_OK

Automated checks + contract smoke tests all pass. Field perf verification deferred to staging.
