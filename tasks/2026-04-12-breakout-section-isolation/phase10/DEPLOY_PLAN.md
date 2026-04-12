# Deploy Plan (stub) — breakout-section-isolation

Per agent instructions this task does NOT push/merge. This document is a
forward-looking plan for a future operator.

## Pre-deploy checklist

- [x] `phase8/REVIEW_OK.marker` present
- [x] `phase9/QA_OK.marker` present
- [x] `npm run build` green
- [x] `npx tsc --noEmit` green
- [x] Prisma migration file committed: `prisma/migrations/20260412_add_section_access_token/migration.sql`
- [x] All 10 acceptance criteria PASS

## Deploy order

1. Merge branch `worktree-agent-a097e463` (local-only in this task) into `feat/breakout-section-isolation`, then open PR against `main`.
2. CI must run `prisma generate` (already in `postinstall`) + build + typecheck.
3. On production database (Supabase ap-northeast-2):
   ```
   npx prisma migrate deploy
   ```
   Expected: applies `20260412_add_section_access_token` (single ADD COLUMN + UNIQUE INDEX). Non-destructive.
4. Deploy to Vercel (ICN1 functions region per project memory).
5. Smoke on preview URL:
   - `GET /board/<any-columns-board>` → 200 (regression).
   - Owner: POST `/api/sections/<any-section-id>/share` → 200 + token.
   - Editor/viewer: POST → 403.
   - GET `/board/<id>/s/<sectionId>?token=…` → 200 with only that section's cards.

## Rollback

- App: redeploy previous Vercel build.
- DB: `ALTER TABLE "Section" DROP COLUMN "accessToken";` then
  `prisma migrate resolve --rolled-back 20260412_add_section_access_token`.
- Data loss risk: any generated share tokens are lost (owners must re-issue after re-applying).

## Post-deploy verification

- Monitor Vercel logs for `[POST /api/sections/:id/share]` or `[GET /api/sections/:id/cards]` 5xx bursts.
- Confirm `/board/<id>/s/<sectionId>` 200 on a live board with known members.

## Local verification (this task's surrogate for deploy)

- Dev server came up on port 3000 cleanly; new routes visible in build manifest.
- Integration suite `regression_tests/view_section.test.ts` passes 7/7 against the real Supabase DB.
- Manual curl checklist captured in `phase9/qa_report.md`.

No remote deploy performed. No `git push` executed.
