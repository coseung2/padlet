# Phase 2 — Scope Decision: P0-② Aura-board receiving endpoint

## Problem statement
Aura-board currently has no externally-accessible card creation API. The planned Canva content-publisher app needs an authenticated HTTPS endpoint to POST cards into a teacher's board. We must also give teachers a way to self-serve issue/revoke tokens.

## In scope
- DB model `ExternalAccessToken` with hash-at-rest storage.
- Library `src/lib/external-auth.ts` (issue/revoke/verify).
- `POST /api/external/cards` — Bearer auth, board-membership + role check, zod validation, optional image handling, rate limit.
- `POST /api/account/tokens` + `DELETE /api/account/tokens/[id]` — teacher self-service.
- Teacher UI `/account/tokens` — list + issue modal + revoke button. Plaintext token shown once after issue.
- Rate limit: in-memory per-token 60/min.
- Docs: `docs/external-api.md` with curl examples + error codes.

## Out of scope (blockers, deferred)
- Canva Apps SDK project (`canva project/content-publisher-app/`) — user builds externally.
- Canva Developer Portal registration + team deploy — user executes externally.
- Multi-instance rate-limit (Redis) — future work if >1 Vercel function replica problem emerges.

## Acceptance criteria
1. Teacher can navigate `/account/tokens`, click "새 토큰 발급", give label, receive one-time plaintext token with copy button.
2. After modal closes, plaintext token is never retrievable (DB stores only `tokenHash`); listing shows label + `lastUsedAt` + `createdAt` + revoke button.
3. `POST /api/external/cards` with valid Bearer token creates a card on the specified board (owner/editor membership required) and returns `{ success, cardId, cardUrl }`.
4. Missing/malformed Authorization header → 401. Unknown token → 401. Revoked token → 401. Timing-safe comparison (no existence-timing leak).
5. Caller with viewer-only membership on target board → 403 with `forbidden` code.
6. `imageDataUrl` (data:image/png;base64,...) with size ≤ 5 MB decoded → stored (Vercel Blob if `BLOB_READ_WRITE_TOKEN` set, else filesystem `/uploads/`) and `Card.imageUrl` populated. Oversized → 413. Non-PNG → 400.
7. 60th request within the same minute per token succeeds; 61st returns 429 with `retryAfter` seconds in body.
8. `docs/external-api.md` includes a working curl example, response schema, and all error codes (400/401/403/404/413/429/500).
9. `npx tsc --noEmit` + `npm run build` PASS on the completed branch.
10. Per-user active-token cap 10 — 11th issue attempt returns 400 with `token_limit_exceeded`.

## Non-goals / explicit defer
- OAuth-style consent UI (Canva app gets a stable PAT per teacher, not per-design).
- Webhook callback from Aura-board → Canva.
- Fine-grained per-board scopes — token grants access to any board the user owns/edits. Acceptable for solo classroom; document.

## Risk table (security-weighted)

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Token leak via request log / error trace | Medium | High (full account compromise) | Mask in logs to `aura_pat_****<last4>`. Never log raw header. CI grep guard: `grep -rn 'Bearer' src/` must not include any `console.log` with token body. |
| R2 | Timing attack on token verify | Low | Medium | Always compute hash before DB lookup; use `findUnique` by hash (single indexed query) not a list scan; use timingSafeEqual on hash when returning. |
| R3 | Token hash-theft → brute force | Very Low | High | 132-bit entropy makes offline brute-force infeasible; SHA-256 salted with `NEXTAUTH_SECRET` (per-deploy entropy). Rotate `NEXTAUTH_SECRET` = all tokens invalidated (documented). |
| R4 | Replay via intercepted Authorization header over plaintext | Low (HTTPS enforced on Vercel) | High | Vercel enforces TLS. Document: never use over HTTP. |
| R5 | Rate-limit bypass by issuing many tokens | Medium | Medium | Cap 10 active tokens per user. |
| R6 | Rate-limit in-memory inconsistency across Vercel Function replicas | Medium | Low | Accept for solo use; document as known limit; future: Redis. |
| R7 | Data URL memory exhaustion (10MB+ images) | Medium | Medium | 5MB decoded cap. Stream parse rejected — buffer-then-validate since payload is entire body. |
| R8 | Image public URL leakage (anyone with URL sees class content) | Medium | Low-Med | Vercel Blob URLs are unguessable; filesystem path under `/uploads/` ditto. Document in external-api.md. |
| R9 | Privilege escalation: student issues token via `/account/tokens` and uses against another teacher's board | Low | High | `/account/tokens` requires authenticated non-student user (mock users + NextAuth only); student auth path (`student-auth.ts`) is distinct and has no relation to `ExternalAccessToken`. |
| R10 | Malicious card content (XSS via title/content) | Low | Medium | Same surface as existing `POST /api/cards`; inherits existing sanitization. No new risk. |

## Mitigations summary for phase8 audit
- Logging masking helper in `external-auth.ts`
- zod schemas strict-reject unknown keys
- per-user token cap enforced in POST /api/account/tokens
- rate-limit counter cleared on verify when `windowStart` > 60s old

## Sign-off
Strategist: APPROVE for architect. AC count = 10. Risks documented (security-heavy). Blockers moved to phase11 `BLOCKERS.md`.
