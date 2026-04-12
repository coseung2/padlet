# Phase 10 — Deploy log (parent UX)

Branch: `feat/parent-viewer-ux` (based on main @ 8a5df45 — includes PV-1~5 auth foundation).

## Artifacts shipped

### Pages (RSC + "use client")
- `src/app/parent/layout.tsx` — root layout, viewport, manifest
- `src/app/parent/(app)/layout.tsx` — authed shell, session guard, nav mount, watchdog mount
- `src/app/parent/(app)/home/page.tsx` — child grid + last-activity
- `src/app/parent/(app)/notifications/page.tsx` — stub
- `src/app/parent/(app)/account/page.tsx`
- `src/app/parent/(app)/account/withdraw/page.tsx`
- `src/app/parent/(app)/child/[studentId]/layout.tsx` — scope guard + tabs
- `src/app/parent/(app)/child/[studentId]/page.tsx` — redirect to plant
- `src/app/parent/(app)/child/[studentId]/plant/page.tsx`
- `src/app/parent/(app)/child/[studentId]/drawing/page.tsx`
- `src/app/parent/(app)/child/[studentId]/assignments/page.tsx`
- `src/app/parent/(app)/child/[studentId]/events/page.tsx`
- `src/app/parent/(app)/child/[studentId]/breakout/page.tsx`
- `src/app/parent/logged-out/page.tsx` — terminal state (outside authed group)

### API routes
- `src/app/api/parent/children/[id]/plant/route.ts`
- `src/app/api/parent/children/[id]/drawing/route.ts`
- `src/app/api/parent/children/[id]/assignments/route.ts`
- `src/app/api/parent/children/[id]/events/route.ts`
- `src/app/api/parent/children/[id]/breakout/route.ts`
- `src/app/api/parent/links/[id]/route.ts` — DELETE teacher revoke
- `src/app/api/parent/account/withdraw/route.ts` — POST
- `src/app/api/parent/session/status/route.ts` — GET heartbeat
- `src/app/api/classroom/[id]/parent-links/route.ts` — GET teacher list
- `src/app/api/cron/parent-weekly-digest/route.ts`
- `src/app/api/cron/parent-anonymize/route.ts`

### Components
- `src/components/parent/ParentBottomNav.tsx`
- `src/components/parent/ChildTabs.tsx`
- `src/components/parent/SessionWatchdog.tsx`
- `src/components/parent/WithdrawClient.tsx`
- `src/components/parent/ParentManagementTab.tsx` — teacher-side (not yet mounted into a classroom page; stand-alone widget ready)

### Libs
- `src/lib/parent-fetch.ts` — client fetch wrapper w/ 401 → auth-lost event
- `src/lib/parent-email.ts` — digest stub (PARENT_EMAIL_ENABLED flag)

### Config
- `vercel.json` — added `crons` block: Monday 00:00 UTC (09:00 KST) for digest, 15:30 UTC daily for anonymize
- `public/parent-manifest.json` — PWA manifest (standalone, portrait, icn1 theme)

### Tests
- `scripts/test-parent-isolation.ts` — AC-5/6/7 runnable via `npx tsx`

## Environment variables (new — optional)

| Var | Purpose | Default |
|---|---|---|
| `PARENT_EMAIL_ENABLED` | turn on real email send (currently stub) | unset → console log |
| `CRON_SECRET` | manual cron trigger auth | unset → only x-vercel-cron header accepted in prod |

## Deploy steps (Vercel)

1. Merge `feat/parent-viewer-ux` → `main`
2. Vercel auto-deploys to preview → production
3. Verify `/parent-manifest.json` loads (200)
4. Verify Vercel Crons dashboard shows 2 jobs registered
5. Seed a fixture: two parents, two students, two links → run `npx tsx scripts/test-parent-isolation.ts`

## Rollback

Revert the branch merge commit. All changes are additive except `vercel.json` (simple diff — remove `crons` key). No schema changes so no Prisma rollback required.
