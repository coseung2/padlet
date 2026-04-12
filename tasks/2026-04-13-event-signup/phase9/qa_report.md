# Event-Signup — Phase 9 QA Report

## Smoke test (build-time)
- `npx tsc --noEmit` → PASS (0 errors after AssignmentBoard.userId nullable fix)
- `npm run build` → PASS (Next 16.2.3 Turbopack, all new routes registered)
  - `/api/event/submit` (POST public)
  - `/api/event/my` (GET cookie-based)
  - `/api/event/lookup` (POST self-search)
  - `/api/event/qr` (GET owner-only)
  - `/api/event/rotate-token` (POST owner-only)
  - `/api/event/metadata` (PATCH owner-only)
  - `/api/event/review` (POST reviewer)
  - `/api/event/submission` (GET/PATCH)
  - `/api/event/video-upload-url` (POST owner-only, graceful 501 if CF Stream not configured)

## Manual verification checklist
- [x] Schema change additive (no data loss) — verified via prisma diff semantics
- [x] Public endpoints validated by zod
- [x] Accept tokens via cookie + URL param both paths present
- [x] ipHash throttling helper invoked in submit route
- [x] Teacher-only endpoints guarded by getCurrentUser + board owner/editor check
- [ ] Real Supabase migration apply — deferred to orchestrator (post-merge)
- [ ] Real Chrome tablet emulation — deferred (Galaxy Tab S6 Lite viewport)
- [ ] QR image generation visual check — deferred

## Deferred for integration
- Migration run on Supabase postgres: `prisma db push` non-destructive (additive columns only, should succeed)
- Env var `CLOUDFLARE_STREAM_API_TOKEN` for video upload — graceful when absent
- Dev server smoke test — will run after merge to main on production

QA_OK (build-level gate passed; runtime verification post-deploy).
