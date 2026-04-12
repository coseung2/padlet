## Inputs consumed
- `tasks/2026-04-12-canva-oembed/phase2/scope_decision.md`
- `tasks/2026-04-12-canva-oembed/phase3/design_doc.md`
- `tasks/2026-04-12-canva-oembed/phase7/diff_summary.md`
- `git show c47fb81`
- `src/lib/canva.ts`
- `src/app/api/cards/route.ts`
- `src/app/api/cards/[id]/route.ts`
- `src/components/CardAttachments.tsx`
- `next.config.ts`
- `src/styles/card.css`
- `src/lib/__tests__/canva-embed.test.ts`
- `src/components/AddCardModal.tsx`
- `src/components/EditCardModal.tsx`
- `src/components/useLinkPreview.ts`
- `src/app/api/link-preview/route.ts`
- `src/components/DraggableCard.tsx`
- `src/components/GridBoard.tsx`
- `src/components/ColumnsBoard.tsx`
- `src/components/StreamBoard.tsx`

## Independent findings
### High — Resolver failure still routes Canva-looking URLs into the iframe branch
- Severity: High
- Path: `src/app/api/cards/route.ts:39-52`, `src/app/api/cards/[id]/route.ts:46-60`, `src/components/CardAttachments.tsx:29,53-60`
- Concrete problem: Both API routes treat `resolveCanvaEmbedUrl(...) === null` as "leave the original URL alone". `CardAttachments` then ignores whether resolution ever succeeded and renders `<CanvaEmbed>` for any `linkUrl` whose path matches `extractCanvaDesignId(linkUrl)`. That breaks the phase3 caller contract for private/down/unresolvable designs: a public-looking Canva URL with failed enrichment still takes the iframe path instead of staying on the existing `.card-link-preview` flow. In practice this means acceptance criterion 5 is not enforced by the data model; it depends on a later iframe error instead.
- Concrete recommended fix: Gate the Canva branch on an explicit "embed resolved successfully" signal that is only stored on successful server enrichment. A dedicated field is the clean fix; absent that, store a canonical embed marker that cannot be forged by raw user input and render the iframe only when that marker is present.

### High — The integration still depends on Canva’s legacy/undocumented embed contract
- Severity: High
- Path: `src/lib/canva.ts:395-417`, `src/components/CardAttachments.tsx:148-163`
- Concrete problem: The resolver still calls `https://www.canva.com/_oembed`, and the renderer hardcodes `https://www.canva.com/design/${designId}/view?embed&meta`. Official Canva developer guidance changed on June 1, 2024: the documented oEmbed endpoint moved to `https://api.canva.com/_spi/presentation/_oembed`, and Canva only promised the old endpoint through June 30, 2024. As of April 12, 2026 the legacy endpoint still responded in a direct check, so this is not a confirmed outage today. Hypothesis: `?embed&meta` is now an undocumented/stale contract; I could not find a current official Canva source that blesses the hand-built iframe URL.
- Concrete recommended fix: Move the resolver to Canva’s current documented oEmbed endpoint and re-derive the embed URL from Canva’s current official embed contract before shipping. Add one live smoke test against a known public design so provider drift fails loudly instead of silently rotting.

### Medium — Create-time metadata source is timing-dependent between `/api/link-preview` and server oEmbed
- Severity: Medium
- Path: `src/components/AddCardModal.tsx:84-92,203-225`, `src/components/useLinkPreview.ts:18-56`, `src/app/api/cards/route.ts:39-52`
- Concrete problem: The create flow eagerly submits `preview?.title`, `preview?.description`, and `preview?.image` from the generic link-preview hook. The POST route then preserves those values with `??`, so a slow submit stores Canva oEmbed metadata, while a slower user or faster client preview stores generic OG metadata instead. The same Canva URL therefore lands with different `linkTitle` / `linkDesc` / `linkImage` depending on client timing, which is a race in the primary enrichment path.
- Concrete recommended fix: Pick one authoritative metadata source for Canva URLs. The minimal fix is to stop sending generic preview fields for Canva URLs from `AddCardModal`; the server resolver should win for this feature.

### Medium — `CanvaEmbed` state does not reset when the card’s Canva URL changes
- Severity: Medium
- Path: `src/components/CardAttachments.tsx:111-166`, `src/components/EditCardModal.tsx:66-73`
- Concrete problem: `loaded` and `failed` live in component state, but the component is not keyed by `designId` and there is no reset effect. If a card changes from one Canva URL to another, React preserves the old state: a previously failed embed stays stuck on the fallback anchor, and a previously loaded embed starts the new URL with `data-loaded="true"` so the thumbnail-first behavior is skipped.
- Concrete recommended fix: Either render `<CanvaEmbed key={designId} ... />` from the parent or add `useEffect(() => { setLoaded(false); setFailed(false); }, [designId, linkUrl])`.

### Medium — Short-link resolution is still on the hot path without a timeout
- Severity: Medium
- Path: `src/lib/canva.ts:316-327,381-388`
- Concrete problem: `resolveCanvaEmbedUrl()` has a 3s timeout on the oEmbed fetch, but `resolveCanvaDesignId()` does an unbounded `fetch(url, { redirect: "manual" })` first for `canva.link`. A slow or hanging short-link response can therefore stall POST/PATCH well beyond the intended 3-second ceiling.
- Concrete recommended fix: Put the same timeout on short-link resolution and prefer a lightweight redirect probe (`HEAD` if Canva supports it, otherwise `GET` with the timeout and `redirect: "manual"`).

### Medium — PATCH null-handling is type-safe for `linkUrl`, but not semantically correct for explicit metadata clears
- Severity: Medium
- Path: `src/app/api/cards/[id]/route.ts:47-58`
- Concrete problem: The `typeof patch.linkUrl === "string"` guard is strict-null-safe for the URL itself. The follow-up metadata writes are not: `patch.linkTitle = patch.linkTitle ?? embed.title` and the corresponding `linkImage` / `linkDesc` writes treat an explicit `null` from the caller as "missing" and overwrite it. That contradicts the diff summary’s claim that only `undefined` fields are back-filled.
- Concrete recommended fix: Keep the `linkUrl` type guard, but change metadata merges to `if (patch.linkTitle === undefined) patch.linkTitle = embed.title` style checks so explicit `null` survives.

### Low — `resolveCanvaEmbedUrl` looks controlled for SSRF/XSS in the current code shape
- Severity: Low
- Path: `src/lib/canva.ts:345-417`
- Concrete problem: I did not find a direct SSRF or attacker-controlled-origin XSS path here. The host check only allows `canva.com` / `www.canva.com` / `canva.link`, the extracted `designId` is regex-limited to `[A-Za-z0-9_-]+`, the oEmbed URL is `encodeURIComponent(...)`-wrapped, and the iframe origin is hardcoded back to `https://www.canva.com`. The code also ignores `body.html`, so there is no `dangerouslySetInnerHTML` sink.
- Concrete recommended fix: No fix required here. Keep the hardcoded Canva origin and keep ignoring provider HTML.

### Low — The iframe sandbox combination does not create same-origin privilege against this app
- Severity: Low
- Path: `src/components/CardAttachments.tsx:156-163`
- Concrete problem: I did not find an app-origin sandbox escape here. `allow-scripts allow-same-origin allow-popups` restores Canva’s own origin inside the sandbox, but the iframe is still `https://www.canva.com`, not the board’s origin, so it cannot reach the parent DOM or same-origin storage for this app.
- Concrete recommended fix: No app-origin isolation fix is required. If Canva popup behavior later needs tuning, change popup permissions for UX reasons, not because of a same-origin escalation risk.

### Nit — Hooks usage is compliant in both `CardAttachments` and `CanvaEmbed`
- Severity: Nit
- Path: `src/components/CardAttachments.tsx:25-30,111-119`
- Concrete problem: I did not find a Rules-of-Hooks violation. `CardAttachments` has no hooks before its early return, and `CanvaEmbed` calls both `useState` hooks unconditionally at the top of the component before the `failed` early return.
- Concrete recommended fix: No fix required. If future hooks are added to `CardAttachments`, keep them above any early return.

### Nit — `React.memo`’s default shallow compare is safe with the current prop shapes and call sites
- Severity: Nit
- Path: `src/components/CardAttachments.tsx:13-25,103-117`, `src/components/DraggableCard.tsx:64,96`, `src/components/GridBoard.tsx:82-90`, `src/components/ColumnsBoard.tsx:404-414`, `src/components/StreamBoard.tsx:89-95`
- Concrete problem: I did not find a referential-instability problem. Both memoized components only receive strings and `null`/`undefined`, and the current callers pass those primitives directly instead of inline arrays, objects, or callback props.
- Concrete recommended fix: No fix required today. Revisit only if a caller starts passing structured props.

### Nit — `next.config.ts` is using the correct Next.js 16 `headers()` config hook, and `frame-src` alone does not implicitly clamp other directives
- Severity: Nit
- Path: `next.config.ts:13-28`
- Concrete problem: I did not find a framework misuse here. This is the build-time `next.config.ts` `async headers()` hook documented by Next.js, not the request-time `headers()` helper from `next/headers`. Because the header value only contains `frame-src ...`, it sets only that directive; it does not implicitly define `default-src`, `img-src`, `script-src`, or others.
- Concrete recommended fix: No fix required for the current scope. If a broader CSP is added later, define the full directive set explicitly instead of assuming inheritance.

### Nit — The thumbnail `<img>` does not currently justify `crossOrigin` or a custom `referrerPolicy`
- Severity: Nit
- Path: `src/components/CardAttachments.tsx:153-155`, `src/components/useLinkPreview.ts:39-46`, `src/app/api/link-preview/route.ts:82-100`
- Concrete problem: I do not see branch-local evidence that adding `crossOrigin` or a custom `referrerPolicy` would make thumbnails more reliable. This `<img>` is display-only, not canvas-readback, and the add flow already often converts preview images into same-origin `/uploads/...` URLs via `/api/link-preview`. `crossOrigin` would change the request mode and can reduce compatibility rather than improve it.
- Concrete recommended fix: Keep the plain `<img>` unless a reproducible Canva CDN failure shows browser defaults are the culprit. If thumbnail reliability becomes a real issue, proxy/cache the image server-side instead of tuning client attributes.

## Verdict
FAIL

Hooks, memo equality, CSP config usage, SSRF/XSS hardening, sandbox isolation, and the thumbnail attribute question all looked acceptable in the current branch. The failure is in the behavior that matters most for this feature: unresolved/private Canva URLs still take the iframe branch, the provider integration is pinned to Canva’s older documented contract, and the create/edit flows still have state and timing issues that make the enrichment path nondeterministic.

Minimum fixes to flip to PASS
- Gate iframe rendering on a server-confirmed successful Canva resolution instead of any Canva-looking `linkUrl`.
- Update the resolver to Canva’s current documented oEmbed endpoint and re-verify the embed URL contract against current official Canva behavior.
- Reset `CanvaEmbed` local state when `designId` / `linkUrl` changes.
- Add a timeout to `canva.link` resolution.
- Make Canva metadata precedence deterministic on create, and use `=== undefined` checks instead of `??` when PATCH back-fills metadata.
