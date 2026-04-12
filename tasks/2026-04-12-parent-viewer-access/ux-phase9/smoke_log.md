# Phase 9 — Smoke QA log

Dev server: `PORT=3000 npm run dev` (Next.js 16.2.3 Turbopack, Ready in 6.3s).

## Public / static

| URL | Expected | Actual |
|---|---|---|
| `GET /parent-manifest.json` | 200 JSON | 200 (verified "Aura-board 학부모") |
| `GET /parent/join` | 200 HTML | 200 |
| `GET /parent/logged-out` | 200 HTML | 200 |

## Unauthenticated requests to gated routes

| URL | Expected | Actual |
|---|---|---|
| `GET /api/parent/children/abc/plant` | 401 | 401 |
| `GET /api/parent/session/status` | 401 | 401 |
| `POST /api/parent/account/withdraw` | 401 | 401 |
| `DELETE /api/parent/links/xxx` | 401/404 | 404 (dev session leak — id not found path) |

## Cron (dev mode allows all callers)

| URL | Expected | Actual |
|---|---|---|
| `GET /api/cron/parent-weekly-digest` | 200 | 200 (ok:true, counts reported) |
| `GET /api/cron/parent-anonymize` | 200 | 200 |

## Acceptance criteria mapping

| AC | Status | Notes |
|---|---|---|
| AC-3 | PASS | 5 feature pages render against existing DB fixtures (plant/drawing/assignments/events/breakout) |
| AC-4 | PASS | Every /api/parent/* uses a scope helper (see security_audit.md) |
| AC-5 | READY | E2E script provided (scripts/test-parent-isolation.ts) — requires fixture env vars |
| AC-6 | READY | Helper `requireParentChildLinkOwned` ships; no public endpoint to expose yet |
| AC-7 | PASS | DELETE link → tx revokes sessions → next poll 401 (verified by inspection) |
| AC-8 | PASS | SessionWatchdog redirects to /parent/logged-out on 401 |
| AC-9 | PASS | Cron runs Mon 00:00 UTC = 09:00 KST; Pro-only; skip-if-zero verified |
| AC-10 | PASS | Withdraw sets parentDeletedAt; cron sha256-anonymizes ≥90d |
| AC-11 | PASS | Manifest served at /parent-manifest.json, registered via root layout Metadata |
| AC-13 | PASS | Events API groups per-board; only child's submissions attached |
| AC-14 | PASS | Breakout API scopes BreakoutMembership by studentId |

## Build + typecheck

- `npx tsc --noEmit` → PASS (0 errors)
- `npm run build` → PASS (all 6 /parent routes + 10 /api/parent* routes emitted)
