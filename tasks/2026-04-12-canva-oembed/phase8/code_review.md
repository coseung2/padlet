# Code Review — canva-oembed (staff engineer)

task_id: 2026-04-12-canva-oembed
branch: feat/canva-oembed
reviewer phase: 8
baseline: main @ `b3f97a2` → HEAD @ `c47fb81`

---

## Scope reviewed

### Commits since scaffold
- `c72d136` chore: scaffold canva-oembed task (phase0) + embed research bank
- `b002f09` docs: phase1 research pack + benchmark + UX patterns
- `71bcf21` docs: phase2 scope decision (Selective Expansion)
- `8dffda0` docs: phase3 design doc
- `bd4fff4` docs: phase4 design brief
- `89a4190` design: phase5 shotgun — 4 variants, v1 selected
- `2a482ca` design: phase6 design review — PASS (9.0/10)
- **`c47fb81` feat: phase7 live Canva iframe embeds (P0-①)** ← the implementation commit under review

No hotfix commits after `c47fb81`. Only one production-source commit to review.

### Files changed (production)
| File | Lines | Change |
|---|---|---|
| `src/lib/canva.ts` | +99 (bottom of file, lines 330-428) | `CanvaEmbed` type, `isCanvaDesignUrl`, `extractCanvaDesignId`, `resolveCanvaEmbedUrl` |
| `src/app/api/cards/route.ts` | +19 inline (enrichment block L34-52) | oEmbed back-fill in POST |
| `src/app/api/cards/[id]/route.ts` | +16 inline (guard block L44-60) | URL-change guarded oEmbed back-fill in PATCH |
| `src/components/CardAttachments.tsx` | +57 (CanvaEmbed subcomponent L97-167) | Canva branch + `memo`-wrapped subcomponent |
| `next.config.ts` | +22 | `async headers()` with `Content-Security-Policy: frame-src …` |
| `src/styles/card.css` | +32 (L207-242) | `.card-canva-embed` rule set + `prefers-reduced-motion` override |

### Tests
- `src/lib/__tests__/canva-embed.test.ts` (+65, new) — 18 table-driven sync cases, plain tsx runner (`18 passed`).

---

## Findings

### MEDIUM

- **[MEDIUM] `src/lib/canva.ts:316-328` — `resolveCanvaDesignId` short-link fetch has no timeout.**
  The pre-existing `resolveCanvaDesignId` (reused by the new `resolveCanvaEmbedUrl`) performs `fetch(url, { redirect: "manual" })` on `canva.link` URLs with **no `AbortSignal.timeout`**. `resolveCanvaEmbedUrl` awaits this hop *before* applying its own 3s oEmbed timeout. On `c47fb81` as deployed, a slow `canva.link` short-link redirect could stall POST `/api/cards` beyond the intended 3s budget. Design doc `phase3/design_doc.md §2-1 step 2` explicitly mandates "HEAD/GET with redirect:'manual', **3s timeout**".
  Rationale: hot-path latency cap. A Canva-side stall on a single card-create request should not block the request beyond the declared budget; the whole design rationale for `null`-return-on-failure is to keep POST latency bounded.
  Fix suggestion: wrap the short-link fetch in `AbortSignal.timeout(3000)` (or compose an `AbortSignal` from the caller so the entire `resolveCanvaEmbedUrl` pipeline shares a single 3s budget). Minimal diff:
  ```diff
  - const res = await fetch(url, { redirect: "manual" });
  + const res = await fetch(url, {
  +   redirect: "manual",
  +   signal: AbortSignal.timeout(3000),
  + });
  ```
  Not a BLOCKER because (a) the caller wraps in try/catch and returns `null` anyway on throw, (b) in practice canva.link 302s respond in <200ms, and (c) `resolveCanvaEmbedUrl` itself is only reached when `isCanvaDesignUrl(rawUrl)` matches.

- **[MEDIUM] `src/components/CardAttachments.tsx:162-163` — iframe `onError` is unreliable for Canva failure detection on school networks.**
  Design doc §5-4 called out a timer-based fallback (e.g., 8s watchdog → `setIframeFailed(true)`) as a phase7 decision. The implementation uses only iframe `onLoad`/`onError`. For school-network full-block scenarios, `onError` may never fire and the user sees a blank 16:9 box forever. The design doc flagged this as a phase7 *decision*; it was silently resolved to "accept forever blank". phase7/diff_summary acknowledges iframe reliability as a known limitation.
  Rationale: acceptance §5 ("실패 폴백") guarantees graceful degradation; without a watchdog, full-block networks fall through the crack.
  Fix suggestion: add a `useEffect` watchdog — if `loaded === false` and `failed === false` after 8s, set `failed = true`. Keep small (a single `setTimeout`).
  Not a BLOCKER because the P0 target users are on open networks where the oEmbed resolver path succeeds, and the `failed` branch already renders a link-preview fallback when tripped.

### LOW

- **[LOW] `src/lib/canva.ts:323` — silent `catch {}` in `resolveCanvaDesignId`.**
  The existing catch-without-log makes canva.link resolution failures invisible to operators. Impact is small (the outer `resolveCanvaEmbedUrl` handles null gracefully) but running without telemetry on the only network hop is a minor operability gap. Fix: `catch (err) { console.warn("[resolveCanvaDesignId] short-link failed", err); }`. This is a pre-existing line and was not introduced in this task, so it's flagged as an improvement rather than a regression.

- **[LOW] `src/lib/canva.ts:403` — hardcoded User-Agent hostname `aura-board-app.vercel.app` does not agree with the project app name.**
  Project convention (`MEMORY.md`) says app name is "Aura-board". Canva likely only inspects the UA loosely, but embedding a specific Vercel preview URL here is fragile if the project is renamed or rehosted. Consider sourcing from an env var (`process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "aura-board"`). Not load-bearing.

- **[LOW] `src/components/CardAttachments.tsx:62-91` — `.card-link-preview` fallback branch now ternary-gated behind `canvaDesignId` being null.**
  Existing YouTube/image/link logic unchanged ✅, but the refactor from `{imageUrl && …} {videoUrl && …} {linkUrl && …}` into a ternary guard means non-Canva links still render via the outer branch, while Canva-that-fell-back renders via the inner `CanvaEmbed` fallback branch (also `.card-link-preview`). Two near-identical render blocks exist. Intentional per the design ("never empty card") but a maintenance smell. Fix suggestion (later task, not a blocker): lift the fallback anchor into a shared `<LinkPreview />` component.

### NIT

- **[NIT] `src/components/CardAttachments.tsx:160` — `sandbox="allow-scripts allow-same-origin allow-popups"`.**
  The combination of `allow-scripts` + `allow-same-origin` is a well-known "sandbox escape" pattern *when* the iframe content is same-origin to the host. In this case the iframe is `canva.com` which is cross-origin to the Aura-board host, so `allow-same-origin` takes effect on the iframe's own origin (which is what Canva needs). This matches the design doc §3-3 verbatim and is the accepted Canva embed pattern. Documented here so the future reader understands it's intentional.

- **[NIT] `next.config.ts:7-11` — CSP contains *only* `frame-src`.**
  This is correct (and matches design doc §2-5 explicitly: "Do NOT add script-src / default-src here"). Worth a one-line comment noting that this is a deliberate, minimal CSP — absence of other directives is by design to avoid regressions in NextAuth / `next/image`. The file-level comment on lines 3-6 already covers this; no action needed.

### Not findings (verified OK)

- `body.html` is **never read** in `resolveCanvaEmbedUrl` → XSS hardening per phase3 §5-6 ✅.
- No `dangerouslySetInnerHTML` anywhere in the diff ✅.
- `String()` / `Number()` coercion on every oEmbed field ✅.
- `isCanvaDesignUrl` / `extractCanvaDesignId` are pure sync, no network ✅.
- POST enrichment back-fills with `?? embed.xxx` so user-provided `linkTitle`/`linkImage`/`linkDesc` win ✅ (matches design §2-2 explicitly).
- PATCH URL-change guard (`patch.linkUrl !== card.linkUrl`) correctly skips drag/resize PATCHes ✅.
- CSP `frame-src` includes `https://www.youtube.com` → YouTube iframe regression avoided ✅.
- `CanvaEmbed` subcomponent is `memo`-wrapped with 5 primitive/null props; shallow-equality safe ✅.
- `data-loaded` attribute wired from React state (not class toggle) — matches design_spec §6.3 ✅.
- `.card-canva-embed` CSS rule set reproduces `tokens_patch.json` exactly (8 wrapper props, 5 descendant props, transition, fade-out, `prefers-reduced-motion` override) ✅.
- Prisma `Card` schema unchanged — all link fields are already `String?` so `?? null` back-fill is type-safe ✅.
- `patch: typeof input = { ...input }` preserves Zod inferred types, no `as` casts ✅.
- No SSRF risk: outbound URLs are built only from `designId` which is regex-constrained to `[A-Za-z0-9_-]+`; host is the hard-coded `www.canva.com` ✅.

---

## Correctness checklist

- [x] Matches design_doc.md (§1 no-migration, §2-1 helpers, §2-2 POST insertion, §2-3 PATCH insertion, §2-5 CSP scope)
- [x] Matches design_spec.md v1 (thumbnail-first fade-in, iframe loading=lazy, data-loaded toggle, min-height/margin-bottom fixes)
- [x] Matches tokens_patch.json (CSS rules byte-for-byte + prefers-reduced-motion media query)
- [x] Types correct (no `any`, `Record<string, unknown>` for JSON, string coercion on oEmbed fields)
- [x] No regressions (YouTube still in frame-src; `.card-link-preview` branch preserved for non-Canva; `memo` contract intact)
- [⚠] Test coverage adequate (18 sync cases OK; resolver integration tests justifiably deferred; watchdog regression absent)

The one `⚠` is the watchdog gap flagged under MEDIUM — phase9 manual QA should explicitly exercise a blocked-network scenario or a watchdog should be added.

---

## Verdict

**PASS** (with two MEDIUM follow-ups to fold into phase9 QA or a phase10 hotfix).

Rationale:
1. Every phase3 design-doc requirement is implemented verbatim; every phase6 review fix (margin-bottom, min-height, `loading="lazy"`, `data-loaded`) is present. CSP scope is correctly minimal, the XSS-hardening contract (`html` field ignored, no `dangerouslySetInnerHTML`) is honored, and `memo` + primitive/null props keep the render contract intact.
2. No BLOCKER or HIGH issues. The two MEDIUMs are (a) a missing timeout on the pre-existing short-link helper — a latency cap issue, not a correctness issue, since the outer try/catch still returns `null` — and (b) a deferred iframe-failure watchdog that phase3 §5-4 left to phase7's discretion; both should be revisited in phase9 QA but neither blocks merge.
3. Test coverage is appropriate for the zero-framework baseline (18 table-driven sync cases; 9 integration cases explicitly deferred to phase9 manual QA with a written checklist).

---

## Summary (<120 words)

Phase7 delivers exactly what phase3/phase5/phase6 contracted: a sync URL detector + async oEmbed resolver in `canva.ts`, POST/PATCH enrichment that honors user overrides and guards drag/resize paths, a `memo`-wrapped `CanvaEmbed` subcomponent with thumbnail-first fade via `data-loaded`, a minimal CSP `frame-src` allowlist that keeps YouTube working, and a CSS rule set matching `tokens_patch.json` byte-for-byte. Two MEDIUM items — a missing 3s timeout on the reused `resolveCanvaDesignId` short-link hop, and no iframe watchdog for school-network blocks — are real but non-blocking; both were phase7 decisions the design docs allowed to defer. No security, type-safety, or regression issues found.

**Verdict: PASS.**
