# Phase 10 — Deploy Plan

## Scope
- Branch: `feat/breakout-room-foundation`
- Target: Solo project → direct merge to `main` by caller (orchestrator handles)
- **This agent does NOT push or merge** — handoff back to caller per instructions.

## Deploy checklist
- [x] Prisma schema applied to Supabase (icn1/ap-northeast-2) via `prisma db push` — non-destructive (3 CREATE TABLE only)
- [x] Seed executed: 8 system templates upserted
- [x] Vercel regions: vercel.json `regions: ["icn1"]` preserved (no change)
- [x] Environment variables: no new ENVs required. `TIER_MODE` optional — defaults to "free"
- [x] `npm run build` PASS
- [x] `npm run typecheck` PASS

## Migration re-run safety
- `prisma db push` is idempotent in the non-destructive path
- `npm run seed:breakout` is idempotent (upsert by key)

## Rollback
- If breakout routes cause runtime issues: revert commits on branch
- DB: dropping 3 Breakout* tables is safe (no FK from non-breakout tables)

## Post-deploy smoke (caller owns)
1. Sign in as teacher
2. "보드 만들기" → "모둠 학습" → kwl_chart → 4모둠
3. Verify 13 sections (12 group + 1 pool)
4. Add a card to 모둠 1 · K
5. Context menu → "모든 모둠에 복제"
6. Verify 11 copies created in other group sections
7. Verify pool section untouched
