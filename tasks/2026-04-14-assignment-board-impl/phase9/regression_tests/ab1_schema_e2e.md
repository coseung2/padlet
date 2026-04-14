# Regression — AB-1 schema + trx e2e

`scripts/_smoke_ab1.ts` — runnable against live DB without seeds.

## What it verifies

1. **Schema reachable**: AssignmentSlot table count, Board.assignment* columns, Submission.assignmentSlotId.
2. **End-to-end transaction**: Classroom → 2 Students → assignment Board (POST /api/boards trx equivalent) → per-student Card + AssignmentSlot. Cleanup on success.
3. **AC-10 single-slot scope**: `findUnique({boardId_studentId})` returns exactly the owner slot. Missing slot throws.
4. **State transition write**: `assigned → submitted` via direct Prisma update (mirrors API layer).

## Run

```
npx tsx scripts/_smoke_ab1.ts
```

Expected output:

```
── AB1-smoke 1 — schema reachable ──
  AssignmentSlot table: N rows
  Board.assignment* reachable on M boards
  Submission.assignmentSlotId reachable, null rows: K
── AB1-smoke 2 — end-to-end CRUD on a throwaway classroom ──
  created classroom ...
  created board ... slug ab1-smoke-...
  AC-10 A scope → 1 own slot only, id=...
  transition assigned→submitted ok: submitted
  cleaned up
✅ AB1 smoke passed
```

## Executed 2026-04-15 run

```
AssignmentSlot table: 0 rows
Board.assignment* reachable on 2 boards          # 2 legacy assignment boards from pre-AB-1 era
Submission.assignmentSlotId reachable, null rows: 2
AC-10 A scope → 1 own slot only
transition assigned→submitted ok
✅ AB1 smoke passed
```
