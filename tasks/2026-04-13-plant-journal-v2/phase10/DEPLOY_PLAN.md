# Deploy Plan — plant-journal-v2

> **No remote push performed by this task per user instructions.** User will handle PR creation and main merge.

## Target
- Branch: `feat/plant-journal-v2`
- Base: `develop` (this worktree is at `develop` + plant-journal v2 commits).
- Deploy target: Vercel preview from PR, then merge → production.

## Pre-deploy checks (all green)
- `npx tsc --noEmit`: PASS (no output).
- `npm run build`: PASS (`✓ Compiled successfully in 8.4s`, 30 pages).
- Phase 8 REVIEW_OK marker: present.
- Phase 9 QA_OK marker: present.
- Prisma schema unchanged → no migration needed on Supabase.
- Vercel region pin (icn1) already enforced in repo `vercel.json` → no change.

## Release steps (user will perform)
1. Push `feat/plant-journal-v2` to origin.
2. Open PR `feat/plant-journal-v2 → develop` (or straight to `main`, matching existing repo convention — per `git log` the recent pattern is to merge feature branches into develop then bubble to main). Include the acceptance-criteria summary from `tasks/2026-04-13-plant-journal-v2/phase2/scope_decision.md`.
3. Vercel will build a preview. Smoke test:
   - Open a plant-roadmap board as teacher → summary view → click a student row → land on `/board/{id}/student/{studentId}` with teacher banner visible.
   - As teacher, add an observation on a non-current stage → expect 201 + inline render (editAnyStage path).
   - As teacher, edit the student's nickname via inline edit → 200 + UI refresh.
   - As student on own plant, advance stage with 0 photos → no-photo reason modal → success.
4. Merge → Vercel production deploy.

## Rollback
- Vercel "Instant Rollback" on previous deploy.
- Or `git revert <merge-sha>` (no DB migration to undo).
- Legacy `StageDetailSheet.tsx` still in tree → v1 horizontal UI can be restored by reverting only the client changes (RoadmapView + plant.css + PlantRoadmapBoard) while keeping API widening intact.

## Observability
- No new error surfaces beyond existing `console.error` in API routes.
- Watch Supabase logs for:
  - 403 bursts on `/api/student-plants/*` (would indicate a permission regression).
  - Slow `db.studentPlant.findUnique({ ..., include: { ... observations: include images }})` under the new drill-down page (worst case a 10-stage plant with ~80 images — should still be <300ms given icn1 co-region).

## Shippability note
Part A and Part B are tightly coupled by the shared `RoadmapView` component (Part B reuses it with `editAnyStage`). **Ship together as one PR** — splitting would introduce a transient state where the drill-down route exists but the vertical-timeline layout that it renders doesn't, or vice versa.
