# Phase 3 — Architecture

## Components

### `src/components/ui/OptimizedImage.tsx` (new)
Thin wrapper over `next/image`. Signature:

```ts
type OptimizedImageProps = {
  src: string;
  alt: string;
  sizes?: string;       // default "(max-width: 768px) 100vw, 480px"
  priority?: boolean;   // default false
  className?: string;
  fill?: boolean;       // default true
  width?: number;
  height?: number;
  unoptimized?: boolean;// default false — true for data: URIs, QR, SVG
  onError?: () => void;
};
```

Behavior:
- `fill`-mode by default so parent container CSS drives sizing.
- Emits `loading="lazy"` unless `priority=true`.
- On error: renders a small placeholder box (`<div className="optimized-img-error">`).
- Auto-detects data URIs and flips `unoptimized=true`.

### `src/app/api/canva/thumbnail/route.ts` (new)
`GET /api/canva/thumbnail?url={encoded}&w={160|320|640}`
- Validates `w ∈ {160,320,640}` — otherwise 400.
- Validates `url` host is in Canva allowlist.
- Fetches the remote image with `Accept: image/*`.
- Streams body with `Cache-Control: public, max-age=86400, immutable` and `Content-Type` preserved.
- This route acts as a LAST-resort path for hosts we don't want to add to `remotePatterns`. Primary path remains `next/image` + `remotePatterns`.

### `next.config.ts`
Add `images.remotePatterns`:
- `https://**.canva.com/**`
- `https://**.canva-web-files.com/**`
- `https://document-export.canva.com/**`
- `https://www.canva.com/**`

Keep existing `reactStrictMode`, CSP headers.

## Component integration matrix

| File | Change |
|---|---|
| `CardAttachments.tsx` | 4 `<img>` → `OptimizedImage` (card image, link preview ×2, canva thumb) |
| `CanvaFolderModal.tsx` | 1 `<img>` → `OptimizedImage` |
| `ExportModal.tsx` | 1 `<img>` → `OptimizedImage` |
| `AddCardModal.tsx` | 2 `<img>` → `OptimizedImage` |
| `EditCardModal.tsx` | 1 `<img>` → `OptimizedImage` |
| `ClassroomDetail.tsx` | QR stays `<img>` (data URL); annotated |
| `plant/TeacherMatrixView.tsx` | lightbox → `OptimizedImage` with priority (modal) |
| `plant/RoadmapView.tsx` | thumb + lightbox → `OptimizedImage` |
| `plant/StageDetailSheet.tsx` | thumb → `OptimizedImage` |
| `plant/ObservationEditor.tsx` | thumb → `OptimizedImage` |

## Data flow

No data model changes. No prisma changes. Pure frontend + 1 new route.
