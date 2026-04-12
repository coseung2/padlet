# Deploy Log — plant-journal-board

> **NOTE**: per operator instruction, **no push / no merge** performed. This phase documents the deploy-ready state only.

## 1. PR 정보
- Branch: `feat/plant-journal-board` (worktree)
- Target: operator will raise PR to `main` manually
- No merge commit yet

## 2. CI 결과 (local proxy for CI)
| Check | Status |
|---|---|
| `npm run typecheck` | PASS |
| `npm run build` | PASS (Next.js 16.2.3 turbopack) |
| `npm run seed` + `npm run seed:plant` | PASS (idempotent) |
| `npx prisma db push` (non-destructive) | PASS — Supabase postgres in sync |
| Custom regression curls (phase9) | PASS |

## 3. 배포 대상
- Intended: preview (Vercel preview deploy) — defer to operator
- Production: deferred

## 4. 프로덕션 검증
Not run. Pre-verification done in local dev (phase9).

## 5. 롤백 절차
In order:

1. `git revert <merge_sha>` — reverts all commits in this task
2. DB rollback (only if observations have been created in prod):
   ```sql
   DROP TABLE "PlantObservationImage";
   DROP TABLE "PlantObservation";
   DROP TABLE "StudentPlant";
   DROP TABLE "ClassroomPlantAllow";
   DROP TABLE "PlantStage";
   DROP TABLE "PlantSpecies";
   ```
3. Update any Board rows with `layout='plant-roadmap'` to `layout='grid'`
4. `/public/uploads/*` cleanup deferred to ops cron

## Commit list on branch
Run `git log main..feat/plant-journal-board --oneline` to confirm before PR.
