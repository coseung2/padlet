# Phase 10 — Deploy Log: Parent Viewer Access PV-1 ~ PV-5

Agent: feat/parent-viewer-auth (worktree-agent-adeeab05)
Date: 2026-04-12
Scope: PV-1 schema · PV-2 teacher invite · PV-3 redeem/magic-link · PV-4 callback/session · PV-5 parentScopeMiddleware.

## Migration applied

```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public"
  at "aws-1-ap-northeast-2.pooler.supabase.com:5432"
🚀 Your database is now in sync with your Prisma schema. Done in 1.62s
```
Non-destructive `prisma db push` only. No data loss.

Tracked SQL: `prisma/migrations/20260412_add_parent_viewer/migration.sql` (4 tables, 14 indexes, 4 unique constraints).

## RLS scaffold — NOT auto-applied

File: `prisma/migrations/20260412_add_parent_viewer/rls.sql`.
Reason for deferral: Prisma DSL cannot express RLS; enabling today would break existing server queries that don't `SET LOCAL app.parent_id`. Middleware layer (`src/lib/parent-scope.ts`) covers the gap in v1.

Enablement steps (PV-9/11):
1. Refactor `/parent/*` DB calls into `prisma.$transaction(async tx => { await tx.$executeRaw…; … })`.
2. `psql "$DATABASE_URL" -f prisma/migrations/20260412_add_parent_viewer/rls.sql`.
3. Run PV-12 E2E to confirm parent-token probes still fail closed.

## Build + typecheck
- `npx tsc --noEmit` → exit 0, no errors
- `npm run build` → 9 routes detected under /api/parent/* and /parent/* — all compile cleanly, Turbopack reports no warnings for parent surface

## Production readiness checklist (BEFORE deploying to prod)

- [ ] Set `PARENT_EMAIL_ENABLED=true` in Vercel env for Preview + Production
- [ ] Provision Resend API key + verified sending domain; wire into `dispatchMagicLink()` (currently a TODO stub — must ship BEFORE go-live or magic-link flow is unusable for real parents)
- [ ] Upgrade in-memory IP rate-limit to Upstash Redis (documented in `phase8/security_audit.md` §3)
- [ ] Apply RLS policies via psql (see steps above) after the $transaction GUC refactor in PV-9
- [ ] Run PV-12 E2E security test suite (deferred to next agent)
- [ ] Remove or gate `/api/parent/test/*` dev-smoke endpoints behind a non-prod env flag

## Follow-up agents (handoff)

The next agent owns PV-6 PWA shell + PV-7 child-scope server filters (per the SSOT matrix in `canva project/plans/parent-viewer-roadmap.md §5`).

Ready-to-use libraries for downstream agents:
- `getCurrentParent()` → `{parent, session}` or null
- `requireParentScope(req)` → parent + active childIds set
- `requireParentScopeForStudent(req, studentId)` → plus 403 gate
- `requireParentChildLinkOwned(req, linkId)` → plus 404 gate
- `withParentScope` / `withParentScopeForStudent` → route-handler wrappers

No push executed. Branch left at worktree-agent-adeeab05 for user to merge/push.
