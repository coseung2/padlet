# Phase 2 — Scope Decision

## Scope

Replace all raw `<img>` usage with a shared `OptimizedImage` wrapper over `next/image`, configure `images.remotePatterns` for external hosts, and add a hardened `/api/canva/thumbnail` proxy that forbids original-size requests. Preserve lightbox originals (authorized preview only).

## Non-goals

- Rewriting card layout / drag behavior
- Migrating existing `/public/uploads/*` to Blob storage (tracked separately)
- Editing `DraggableCard.tsx` beyond passing props (coordination risk)

## Acceptance criteria

1. `git grep '<img '` in `src/` returns ONLY whitelisted comment/test occurrences (production render paths fully migrated).
2. Below-the-fold card images use `loading="lazy"` (default for `next/image`). Verified in DevTools Network tab — not fetched until scrolled into view.
3. `srcset` attribute on each optimized image exposes ≥ 3 width variants.
4. Galaxy Tab S6 Lite emulation (1500×2000, DPR 2, 3G Fast throttle): per-card image response ≤ 300 KB; time-to-first-card-image < 2 s.
5. `GET /api/canva/thumbnail?url=...&w={160|320|640}` returns 2xx with a resized image; requests without `w` or with `w` outside {160,320,640} → 400.
6. Plant observation `/uploads/*` originals remain viewable in the lightbox (auth-gated by existing session).
7. `npm run build` + `npm run typecheck` PASS.

## Risks

- **Canva thumbnail host drift** — Canva occasionally rotates CDN hostnames. Mitigation: wildcard `**.canva.com` + `**.canva-web-files.com` patterns, plus server-side proxy fallback (`/api/canva/thumbnail`) to decouple us from their CDN.
- **Layout shift** — `next/image` requires width/height or `fill`. Mitigation: use `fill` mode inside existing sized parent containers which already have CSS constraints.
- **Turbopack + next/image interop on Next 16** — Both are first-party; config surface (`images.remotePatterns`) is stable. Low risk.
- **DraggableCard conflict with T0-②** — Minimize contact: all image swaps live in `CardAttachments`, not `DraggableCard`.
- **Data-URL QR codes** — `next/image` can't optimize data URIs. Keep QR as plain `<img>` with `// eslint-disable-line` or use `unoptimized` prop. Decision: `unoptimized` prop (no fetch overhead).

## Change type

`feature` — introduces new API route + new shared component + config change.
