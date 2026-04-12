# phase7 diff summary — canva-oembed

## 1. `src/lib/canva.ts`
- New exported type `CanvaEmbed` (iframeSrc, thumbnailUrl, title, authorName, width, height, designId).
- `isCanvaDesignUrl(rawUrl)` — pure sync predicate: matches `canva.com` / `www.canva.com` / `canva.link`, requires `/design/{id}` path when on canva.com.
- `extractCanvaDesignId(rawUrl)` — pure sync extractor returning the designId from canva.com URLs; returns `null` for canva.link (which requires the async resolver).
- `resolveCanvaEmbedUrl(rawUrl)` — async resolver that: validates with `isCanvaDesignUrl`, resolves short-links via the existing `resolveCanvaDesignId`, canonicalizes to `/view`, calls the Canva oEmbed endpoint with a 3s `AbortSignal.timeout`, validates `type === "rich"` + `thumbnail_url`, and returns the narrowed `CanvaEmbed`. Any failure path returns `null`. `body.html` is deliberately ignored (XSS hardening per phase3 §5-6).

## 2. `src/app/api/cards/route.ts` (POST)
- Imports `isCanvaDesignUrl`, `resolveCanvaEmbedUrl`.
- Before `db.card.create`, when `linkUrl` is a Canva design URL, calls the resolver and back-fills `linkUrl` (canonicalized), `linkTitle`, `linkImage`, `linkDesc` only when the user didn't provide them. Non-Canva URLs and resolver failures leave the original input untouched.

## 3. `src/app/api/cards/[id]/route.ts` (PATCH)
- Same import.
- `patch` object derived from validated input. oEmbed is re-run **only** when `patch.linkUrl !== card.linkUrl` and the new URL is Canva — so drag/resize PATCHes pay no outbound fetch.
- Back-fill only when patch fields are undefined (preserves explicit user overrides).

## 4. `src/components/CardAttachments.tsx`
- New `useState` inside the component for `canvaDesignId` detection via `extractCanvaDesignId`.
- Existing `.card-link-preview` branch is now guarded so it renders only when the URL is **not** a Canva design.
- New internal `CanvaEmbed` subcomponent (also `memo`-wrapped) that:
  - Paints the cached `linkImage` thumbnail first (if present).
  - Renders the iframe with `sandbox="allow-scripts allow-same-origin allow-popups"`, `referrerPolicy="no-referrer-when-downgrade"`, `loading="lazy"`, and `title` populated from `linkTitle` (a11y).
  - Toggles `data-loaded="true"` on the wrapper from iframe `onLoad` so CSS fades the thumbnail out.
  - On iframe `onError`, swaps to a minimal `<a class="card-link-preview">` with the same metadata.
- iframe is built from `designId` in JSX (no `dangerouslySetInnerHTML`).

## 5. `next.config.ts`
- New `async headers()` returning a single header entry for `/:path*` with `Content-Security-Policy: frame-src 'self' https://www.canva.com https://www.youtube.com`.
- No other directives set — leaves `script-src` / `img-src` / `default-src` at browser defaults so NextAuth flows, `next/image`, and external OG thumbnails continue to work.

## 6. `src/styles/card.css`
- Appended `.card-canva-embed` rule set: `position: relative`, `padding-bottom: 56.25%` (16:9), `min-height: 90px` (tiny-card floor), `background: var(--color-bg)`, `border-radius: 8px`, `margin-bottom: 8px` (sibling rhythm).
- Absolute-position rules for nested `img` and `iframe`.
- `opacity: 0` on `[data-loaded="true"] > img` with `transition: opacity 150ms ease`.
- `prefers-reduced-motion` override disables the transition.

## 7. Tests
- `src/lib/__tests__/canva-embed.test.ts` — 18 table-based unit cases. 9 for `isCanvaDesignUrl`, 9 for `extractCanvaDesignId`. Plain `tsx` runner; `npx tsx …` prints `18 passed, 0 failed`.

## Verification
- `npm run typecheck` — PASS (no new errors).
- `npm run build` — PASS (all 48 routes compile; no CSP-related build warnings).
- `npx tsx src/lib/__tests__/canva-embed.test.ts` — `18 passed, 0 failed`.

## Out of scope (confirmed from phase2)
- Prisma `Card.kind` column.
- Webhook-driven card refresh.
- Private-design authentication / badge UI.
- Content Publisher Intent app (P0-② — separate task).
- Generic multi-platform oEmbed (separate `generic-oembed` task; embed-research bank retained).
