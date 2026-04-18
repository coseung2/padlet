# Phase 2 — Scope Decision

## Scope

Harden `/api/external/cards` + `ExternalAccessToken` to Seed 8 contract. In scope:
- CR-1 ~ CR-10 (see prompt)
- 15 acceptance criteria (AC-01..AC-15)
- Stage 1 migration only (nullable tokenPrefix)
- Graceful fallback for Upstash + Blob when envs missing

Out of scope:
- Stages 2/3 migration execution (documented in MIGRATION_PLAN.md)
- Resend email notification for legacy revoke
- Real User.tier schema column (MVP reads FREE_USER_IDS env)
- CRC32 checksum, sectionId UI dropdown, deeplink spec — v1.1+

## Acceptance Criteria (15)

1. AC-01: Zod strict on POST /api/external/cards → unknown keys = 422 `invalid_data_url`
2. AC-02: 200 OK `{id, url: "https://aura-board-app.vercel.app/board/<slug>#c/<cardId>"}`
3. AC-03: All errors `{error:{code,message}}`, 12 canonical codes
4. AC-04: PAT prefix-based O(1) lookup + timing-safe hash compare + dummy compare on prefix miss
5. AC-05: Pro tier only for cards:write → Free = 402 `tier_required` + upgrade link
6. AC-06: 3-axis rate limit (60/min/token, 300/hr/teacher, 300/min/IP) OR; 429 + Retry-After
7. AC-07: Content-Length > 4MB → 413 `payload_too_large` before body parse
8. AC-08: Streaming Blob upload (multipart), p95 < 2000ms (3MB PNG)
9. AC-09: RBAC owner/editor on board else 403 `forbidden`
10. AC-10: Token 1-time exposure; list shows prefix + metadata only (no full token)
11. AC-11: Teacher UI `/(teacher)/settings/external-tokens`, 44px touch targets, tier-aware CTA
12. AC-12: 10 active token cap per user → 11th = 400 `token_limit_exceeded`
13. AC-13: Node.js runtime (`export const runtime = "nodejs"`)
14. AC-14: Stage 1 migration applied (tokenPrefix nullable) + MIGRATION_PLAN.md for Stages 2/3
15. AC-15: `npm run build` + `npx tsc --noEmit` PASS

## Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | p95 > 2000ms | streaming put + 4MB early guard + no full-body buffer |
| R2 | Legacy PAT coexistence | nullable prefix + slow-path iteration + dummy hash pad |
| R3 | PEPPER rotation | env-only, fail-loud at startup if missing in prod |
| R4 | Tier drift (no column) | FREE_USER_IDS env MVP; dual-check issue+receive |
| R5 | Timing side-channel | dummy sha256+timingSafeEqual on prefix miss |
| R6 | Upstash outage | fail-open + in-mem fallback; healthz optional |
| R7 | Blob outage | fs fallback writes `/public/uploads/` (dev only) |
| R8 | Token leak | 1-time modal, secret scanner regex, no plaintext DB |
| R9 | Over-issuance | 10 cap + revoke button + tier gate |
| R10 | Unknown body keys | zod `.strict()` + 422 |
| R11 | RBAC bypass | requirePermission(boardId, user.id, "edit") before any write |
| R12 | Response leak | only `{id, url}` in 200 response |

Risk count: 12 (≥ required 1).

## 3-dim matrix (security / performance / UX)

- Security: 0.40 weight (PAT hashing, timing safety, tier gating, body guard)
- Performance: 0.30 weight (streaming Blob, fast-path lookup, 4MB cutoff)
- UX: 0.30 weight (1-time reveal, teacher UI, copy button, tier badge)

## Exit gate

≥13 AC + risks + matrix present → PASS (15 AC, 12 risks).
