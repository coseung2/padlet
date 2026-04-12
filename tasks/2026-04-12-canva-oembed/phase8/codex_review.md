# Canva oEmbed — Phase 8 Codex Review (Round 4)

## Revision history
- Round 1: PASS on the initial phase7 implementation, with non-blocking follow-ups around timeout/watchdog behavior.
- Round 2: FAIL because Canva-looking URLs could still reach the iframe path without a server-confirmed successful resolve.
- Round 3: FAIL because `linkImage` was still client-spoofable alongside Canva URLs, so the iframe gate could be satisfied without server-owned oEmbed.
- Round 4: POST now enforces server ownership of `linkImage`, but PATCH still leaves a bypass when `linkUrl` is omitted or unchanged on an already-Canva card.

## Scope of this pass
Reviewed HEAD `804208170b93d3001dd77f151bd130f93d0ed38f` on `feat/canva-oembed`, not the commit message. I read the requested files plus the create/edit call sites needed to answer whether any path can still make `canvaDesignId && linkImage` truthy without a successful server oEmbed resolve.

## Verification
### src/app/api/cards/route.ts (POST)
- Lines 47-63: In the Canva branch, `const embed = await resolveCanvaEmbedUrl(linkUrl);` then success force-sets `linkImage = embed.thumbnailUrl;` (line 53) and failure force-sets `linkImage = null;` (line 62). There is no `??` fallback to the client value and no `input.linkImage === undefined` gate inside this branch. `linkTitle` / `linkDesc` still respect explicit client values because they are only back-filled when `input.linkTitle === undefined` / `input.linkDesc === undefined` (lines 54-56).
- Verdict: OK

### src/app/api/cards/[id]/route.ts (PATCH)
- Lines 52-67: The overwrite/null logic exists only inside `if (typeof patch.linkUrl === "string" && patch.linkUrl !== card.linkUrl && isCanvaDesignUrl(patch.linkUrl))`. Inside that guard, success force-sets `patch.linkImage = embed.thumbnailUrl;` (line 60) and failure force-sets `patch.linkImage = null;` (line 66). `patch.linkTitle` / `patch.linkDesc` still respect explicit client values because they are only back-filled when `patch.linkTitle === undefined` / `patch.linkDesc === undefined` (lines 61-63).
- Verdict: BYPASS
- Edge case — PATCH that only changes linkImage while stored URL is Canva: The PATCH path does not re-derive `linkImage` from the stored URL. If `patch.linkUrl` is omitted or unchanged, `const patch: typeof input = { ...input };` preserves the client `linkImage`, and `db.card.update({ where: { id }, data: patch })` writes it as-is (lines 51-52, 70).

### src/components/CardAttachments.tsx
- Lines 29-37, 61-73: `canvaDesignId` is still derived as `linkUrl ? extractCanvaDesignId(linkUrl) : null`, `canRenderCanvaEmbed` is still `Boolean(canvaDesignId && linkImage)`, and the live branch is still `linkUrl && canRenderCanvaEmbed && canvaDesignId ? <CanvaEmbed ... /> : linkUrl && (...)`.
- Verdict: OK

### src/lib/canva.ts
- Lines 402-405, 435-436, 411-415, 323-326: Endpoint fallback is present (`api.canva.com/_spi/presentation/_oembed` then `www.canva.com/_oembed`), the oEmbed fetch has a 3s timeout, and the resolver still validates `body.type === "rich"` plus a string `thumbnail_url`. `resolveCanvaDesignId()` also has a 2s timeout for `canva.link` expansion, but the code at lines 323-326 does not explicitly use `HEAD`; it relies on default `fetch` semantics.

### canvaDesignId provenance
- Where it is derived and whether client input can spoof it: In the opened render path it is re-derived client-side from `linkUrl` via `extractCanvaDesignId(linkUrl)` in `src/components/CardAttachments.tsx:29`. I found no separate `canvaDesignId` input in the opened POST schema (`src/app/api/cards/route.ts:8-25`), PATCH schema (`src/app/api/cards/[id]/route.ts:8-24`), or server-to-client card prop mapping (`src/app/board/[id]/page.tsx:125-144`). Client input can influence it only indirectly by changing `linkUrl`; I did not open the Prisma schema, so this statement is limited to the request/render path I verified.

## Residual bypass analysis
- `POST /api/cards` with a Canva URL plus attacker-supplied `linkImage` is not exploitable now, because the Canva branch always overwrites `linkImage` with `embed.thumbnailUrl` on success or `null` on failure (`src/app/api/cards/route.ts:47-63`).
- `PATCH /api/cards/[id]` that changes `linkUrl` to a different Canva URL plus attacker-supplied `linkImage` is also not exploitable now, because the changed-URL Canva guard always overwrites `patch.linkImage` with `embed.thumbnailUrl` or `null` (`src/app/api/cards/[id]/route.ts:52-67`).
- A remaining exploit exists for an already-Canva card whose stored `linkUrl` is a `canva.com/design/...` URL that `extractCanvaDesignId()` can parse. Request shape: `PATCH /api/cards/<id>` with body `{"linkImage":"https://attacker.example/anything.jpg"}`. This skips the Canva guard because `patch.linkUrl` is omitted (`src/app/api/cards/[id]/route.ts:52-56`), persists the attacker value via `db.card.update(... data: patch)` (`src/app/api/cards/[id]/route.ts:70`), and then satisfies the iframe gate because render still checks only `extractCanvaDesignId(linkUrl)` plus truthy `linkImage` (`src/components/CardAttachments.tsx:29,37,61-73`).
- I found no built-in client-side path that locally renders the iframe before a server round-trip. `AddCardModal` does send preview-derived `linkImage` (`src/components/AddCardModal.tsx:84-91`), but the create flows append cards only from the POST response in `src/components/BoardCanvas.tsx:80-99`, `src/components/GridBoard.tsx:33-54`, `src/components/StreamBoard.tsx:33-54`, and `src/components/ColumnsBoard.tsx:208-228`; the local modal preview is just an image/title card, not `CardAttachments` (`src/components/AddCardModal.tsx:213-224`). `ColumnsBoard` does have an optimistic PATCH merge (`src/components/ColumnsBoard.tsx:250-255`), but the opened `EditCardModal` payload does not include `linkImage` (`src/components/EditCardModal.tsx:66-73`).

## Final verdict
**FAIL** — POST now gives the server full ownership of `linkImage` for Canva URLs, but PATCH still allows `linkImage` to be updated independently when the card already has a Canva `linkUrl`, so the iframe branch can still be reached without a successful oEmbed resolve in that PATCH path.
