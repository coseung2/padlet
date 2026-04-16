# Phase 8 — Security audit

## PAT handling
- Plaintext never persisted. `tokenHash = SHA-256(secret ‖ AURA_PAT_PEPPER)`.
- 1-time modal returns `fullToken` from POST /api/tokens; list endpoints only return `tokenPrefix`.
- `AURA_PAT_PEPPER` (≥32 chars) fail-loud in prod via `pepper()` throw.
- PEPPER rotation invalidates all active tokens by design — documented.

## Timing side-channel
- `parseBearer` failure still burns a dummy compare.
- Prefix miss: `hashesEqualCT(candidate, DUMMY_HASH)` executes before returning `invalid_token`.
- Hash mismatch: uses `timingSafeEqual` on equal-length buffers.
- Result: the 3 failure paths (format / prefix miss / hash mismatch) do one sha256 + one timingSafeEqual each.

## Rate-limit bypass
- 3 axes (token, teacher, IP) OR'd — any breach → 429.
- Upstash outage → fail-open by default (documented); `RL_FAIL_MODE=close` inverts.
- IP from `x-forwarded-for` then `x-real-ip` fallback `0.0.0.0`. IP hashed (sha256 first 16 hex chars) before Redis key to avoid PII in cache.

## Body guard
- Content-Length > 4MB → 413 BEFORE `req.json()`. No full-buffer accumulation reachable.
- Additional post-decode approxBytes check catches chunked requests where Content-Length is absent.

## Tier dual-defense
- Issue-time: `/api/tokens` POST → `requireProTier(user.id)`.
- Receive-time: `/api/external/cards` → `requireProTier(token.user.id)`.
- `FREE_USER_IDS` env allowlist resolves each call — no caching → R7 strip-down enforced.

## Response surface
- Success: `{id, url}` only — no imageUrl, no internal fields.
- Errors: `{error:{code,message}}` — 12 canonical codes, no stack traces.

## Audit checklist
- [x] No plaintext in DB (verified schema — only tokenHash + tokenPrefix persisted)
- [x] No plaintext in logs (no console.log on full token / Authorization header)
- [x] Secret-scanner regex compliant (aurapat_XXXXXXXX_YYYY…)
- [x] RBAC enforced via requirePermission(edit)
- [x] scopeBoardIds allowlist check
- [x] Content-Length 4MB hard guard
- [x] Timing pad on miss paths
- [x] Free 402 on both issue + receive
- [x] Rate limit with Retry-After
- [x] Runtime nodejs (no Edge)
