This is a re-review of commit `7dd0b7e` after the prior FAIL. It supersedes the previous review at this same path.

## Inputs consumed
- Branch check: `git rev-parse --abbrev-ref HEAD` → `feat/canva-oembed`
- Commit metadata: `git show --stat --oneline --decorate=short 7dd0b7e`
- Commit message and targeted diff: `git show --format=medium --no-patch 7dd0b7e` and `git show --unified=80 7dd0b7e -- src/lib/canva.ts src/app/api/cards/route.ts src/app/api/cards/[id]/route.ts src/components/CardAttachments.tsx tasks/2026-04-12-canva-oembed/phase8/codex_review.md`
- `src/lib/canva.ts`
- `src/app/api/cards/route.ts`
- `src/app/api/cards/[id]/route.ts`
- `src/components/CardAttachments.tsx`
- `src/components/AddCardModal.tsx`
- `src/components/useLinkPreview.ts`
- `src/app/api/link-preview/route.ts`
- `src/lib/__tests__/canva-embed.test.ts`
- `npm run typecheck` → passed
- `npx tsx src/lib/__tests__/canva-embed.test.ts` → could not run in this sandbox (`listen EPERM` on `/tmp/tsx-1000/15.pipe`)

## Independent findings
### Resolved
- Prior FAIL item 2 is resolved. `resolveCanvaDesignId()` now wraps the `canva.link` redirect probe in `signal: AbortSignal.timeout(2000)` and contains it in `try/catch`, so short-link expansion no longer has an unbounded wait: `fetch(url, { redirect: "manual", signal: AbortSignal.timeout(2000) })` in `src/lib/canva.ts:319-328`. The code uses the default `GET` rather than an explicit `HEAD`, but the missing-timeout bug is fixed.
- Prior FAIL item 3 is resolved. `POST /api/cards` now distinguishes omitted fields from explicit clears: `let linkTitle = input.linkTitle === undefined ? null : input.linkTitle;` and only back-fills when `input.linkTitle === undefined` (same pattern for `linkImage` and `linkDesc`) in `src/app/api/cards/route.ts:42-55`. `PATCH /api/cards/[id]` uses the same `=== undefined` checks on `patch.linkTitle`, `patch.linkImage`, and `patch.linkDesc` in `src/app/api/cards/[id]/route.ts:50-63`. Explicit `null` survives instead of being overwritten.
- Prior FAIL item 4 is resolved. `CardAttachments` now passes `key={canvaDesignId}` into `<CanvaEmbed>` in `src/components/CardAttachments.tsx:53-64`, so a design-id change remounts the child and clears `loaded` / `failed`. The new key does not create a Hooks or `React.memo` problem: `CardAttachments` still has no hooks before its early return (`src/components/CardAttachments.tsx:25-31`), and `CanvaEmbed` still calls both `useState` hooks unconditionally at the top (`src/components/CardAttachments.tsx:122-123`).
- The endpoint-fallback mechanics introduced for prior FAIL item 1 are themselves correct. `resolveCanvaEmbedUrl()` now tries `https://api.canva.com/_spi/presentation/_oembed` first and `https://www.canva.com/_oembed` second via a sequential `for (const endpoint of endpoints)` loop in `src/lib/canva.ts:402-426`. `fetchCanvaOEmbed()` wraps each fetch in `try/catch` with `AbortSignal.timeout(3000)` and returns `null` on any failure in `src/lib/canva.ts:431-445`, so an `AbortError` on one endpoint falls through to the next instead of escaping `resolveCanvaEmbedUrl()`. The loop returns on the first valid body, so there is no double-emit path and no unhandled rejection from a "losing" request.

### Deferred-and-acceptable
- The provider-contract dependency remains, but I treated it as acceptable per the task's explicit defer-to-docs rule. The code now prefers the documented `api.canva.com/_spi/presentation/_oembed` endpoint and keeps `https://www.canva.com/_oembed` as fallback in `src/lib/canva.ts:402-405`; both `resolveCanvaEmbedUrl()` and `CanvaEmbed` still hardcode `/view?embed&meta` in `src/lib/canva.ts:417-424` and `src/components/CardAttachments.tsx:152`. The `7dd0b7e` commit message documents the endpoint-fallback rationale: `Canva is currently migrating from the legacy www.canva.com path to api.canva.com — try the new endpoint first and fall back to the legacy one.`
- The create-time metadata race also remains by design, but I treated it as acceptable because the commit explicitly documents that rationale. `AddCardModal` still submits `linkTitle: preview?.title || undefined`, `linkDesc: preview?.description || undefined`, and `linkImage: preview?.image || undefined` in `src/components/AddCardModal.tsx:84-91`, and `useLinkPreview()` still sources those fields from `/api/link-preview` in `src/components/useLinkPreview.ts:18-56` and `src/app/api/link-preview/route.ts:5-110`. The `7dd0b7e` commit message explicitly says: `Remaining codex point "create-time metadata race between /api/link-preview and server oEmbed" is documented as acceptable: client-provided explicit values win by design, and the race window is bounded by the same POST request.`

### Still-broken
- Prior FAIL item 1 is still open. If server-side Canva resolution fails for a `canva.com/design/...` URL, both API routes leave the original `linkUrl` in place because canonicalization and metadata updates only happen inside `if (embed)` in `src/app/api/cards/route.ts:46-55` and `src/app/api/cards/[id]/route.ts:56-64`. `CardAttachments` still chooses the Canva iframe branch solely from `extractCanvaDesignId(linkUrl)` via `const canvaDesignId = linkUrl ? extractCanvaDesignId(linkUrl) : null;` and `{linkUrl && canvaDesignId ? <CanvaEmbed ... /> : linkUrl && (...)}` in `src/components/CardAttachments.tsx:29,53-65`. That means private/down/unresolved `https://www.canva.com/design/...` URLs still enter `<CanvaEmbed>` and rely on later iframe failure instead of staying on the normal link-preview path. The commit message itself acknowledges this remaining gap: `Resolver still returns null if both endpoints fail — iframe still attempts and falls back via onError; a richer "oEmbed resolved" marker requires a schema field and is deferred.` This item was not one of the task's acceptable doc-only deferrals, so the previous FAIL does not flip to PASS.

## Verdict
Three of the four prior FAIL items are fixed in code, and the two separately deferred provider-contract / create-time-race issues are documented well enough to treat as acceptable for this re-review. The remaining blocker is still the first prior FAIL item: unresolved Canva design URLs can still take the iframe branch because rendering is keyed off `extractCanvaDesignId(linkUrl)` rather than a server-confirmed successful resolution.

Verdict: FAIL
