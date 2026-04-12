# Phase 10 — Deploy Plan (dry-run, NO push)

## Status
User prompt: **do NOT push/merge**. This phase documents the intended rollout sequence for the operator without executing it.

## Branch
- `feat/drawpile-schema-stub` — commits phase0..phase11, no merge to main.

## Pre-deploy checklist (when ready to ship)
1. Operator applies `prisma/migrations/20260413_add_drawpile_student_assets/migration.sql` to Supabase prod (BLOCKERS.md #5).
2. Confirm Prisma client on Vercel rebuilds (`postinstall` runs `prisma generate`).
3. Smoke create+upload on Preview deploy against applied migration.
4. Keep `NEXT_PUBLIC_DRAWPILE_URL` **unset** in Production until Drawpile server is live → `/board/[id]` with `layout=drawing` shows placeholder (safe).

## Rollback
- Revert `feat/drawpile-schema-stub` merge commit. New tables remain (harmless; unreferenced). Optionally drop manually later.

## Post-deploy verification
- GET `/board/[new-drawing-board]` as student → placeholder + empty library sidebar visible.
- POST `/api/student-assets` curl — ensure 401 without cookie, 200 with student cookie + image.

No CLI deploy performed in this task.
