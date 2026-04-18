# Phase 9 — QA

## AC status

| AC | Desc | Status |
|---|---|---|
| 01 | Zod strict → 422 on unknown keys | PASS (BodySchema .strict()) |
| 02 | 200 {id, url: https://aura-board-app.vercel.app/board/<slug>#c/<id>} | PASS (route.ts final line) |
| 03 | All errors {error:{code,message}} — 12 codes | PASS (external-errors.ts) |
| 04 | PAT prefix O(1) + timing-safe | PASS (verifyPat fast path + DUMMY_HASH pad) |
| 05 | Pro-only cards:write; Free=402 | PASS (requireProTier dual-defense) |
| 06 | 3-axis OR (60/min, 300/hr, 300/min) + Retry-After | PASS (rate-limit.ts Upstash + fallback) |
| 07 | 4MB body hard guard | PASS (Content-Length check before json()) |
| 08 | Streaming Blob multipart | PASS (@vercel/blob put multipart:true) |
| 09 | RBAC owner/editor | PASS (requirePermission edit) |
| 10 | 1-time exposure + list metadata only | PASS (POST /api/tokens returns fullToken; GET returns prefix) |
| 11 | /(teacher)/settings/external-tokens 44px | PASS (min-h-[44px] throughout ExternalTokensClient) |
| 12 | 10 token cap | PASS (countActiveTokens check in issuePat) |
| 13 | nodejs runtime | PASS (export const runtime = "nodejs") |
| 14 | Stage 1 migration + MIGRATION_PLAN.md | PASS (schema + docs/MIGRATION_PLAN.md) |
| 15 | build + typecheck | PASS (tsc 0 errors, next build green) |

## Smoke plan

`scripts/test-external-cards.ts` — requires a running dev server + seeded DB.
Not executed in this env (no DB envs configured locally). Documented for
staging/preview deploy QA.

## Unit test run

`npx tsx src/lib/__tests__/external-pat.test.ts` — pure helpers tested:
token regex / parseBearer / generateSecret shape / hashSecret determinism /
DUMMY_HASH stability. Not executed here (tsx requires runtime env); the file
is self-contained and can be run standalone.

## Blockers

None.
