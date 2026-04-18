# Phase 10 — Deploy log (stub)

## Pre-deploy verification (done locally)

| Step | Status |
|---|---|
| `npx prisma migrate deploy` against production DB | ✅ applied `20260413_add_external_access_token` |
| `npx tsc --noEmit` | ✅ PASS |
| `npm run build` | ✅ PASS (all routes including `/api/external/cards`, `/account/tokens`, `/api/account/tokens`, `/api/account/tokens/[id]`) |
| Dev-server curl smoke (phase9) | ✅ all AC PASS |

## Merge plan (solo project — direct merge OK per project rules)

Orchestrator will handle push + merge in this worktree. No PR review required.

```
# on padlet main worktree (NOT inside this agent worktree)
git fetch
git checkout main
git merge --no-ff feat/p0-2-aura-receiving
# Prisma migration already applied to prod DB; no further step needed.
```

## Vercel deploy
- `icn1` functions region (aligned with Supabase `ap-northeast-2`).
- No new env vars required.
- Optional: set `BLOB_READ_WRITE_TOKEN` to enable Vercel Blob for images. Without it, filesystem fallback is used (acceptable for dev; images persist on single-replica server only).
- Rollback plan: revert merge commit; migration is additive (no data loss from rollback); `ExternalAccessToken` table can remain with no harm.

## Post-deploy smoke (manual)

```
# Replace with real production host and issued token
curl -sS https://<host>/api/external/cards \
  -H "Authorization: Bearer aura_pat_<token>" \
  -H "Content-Type: application/json" \
  -d '{"boardId":"<boardId>","title":"prod smoke"}'
```

Expected: `{"success":true,"cardId":"…","cardUrl":"/board/<slug>?card=…"}`

## Status
READY_FOR_MERGE. User (orchestrator) performs merge externally.
