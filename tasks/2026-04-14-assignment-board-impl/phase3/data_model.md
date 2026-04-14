# Data Model — assignment-board

**Source of truth** for Prisma schema changes. Paired with `architecture.md`.

---

## 1. Board (ALTER)

```prisma
model Board {
  // … existing fields unchanged …

  // ── Assignment board (AB-1) ────────────────────────────────────────
  assignmentGuideText String? @default("")
  assignmentAllowLate Boolean @default(true)
  assignmentDeadline  DateTime?  // null = no deadline; combine w/ allowLate gate

  assignmentSlots     AssignmentSlot[]
}
```

### Rationale
- `assignmentGuideText` is nullable because event-signup / quiz / plant boards leave it unused. Empty-string default keeps migration non-destructive.
- `assignmentAllowLate` default `true` matches decisions.md Q2 (마감 전 자유 수정 + 마감 후는 교사 flag).
- `assignmentDeadline` is **not in seed ontology** but is load-bearing for AC-7 gradingStatus gate (`deadline OK || allowLate=true`). Without a stored deadline the app has no way to evaluate "before-deadline" branch. Added as required inference; phase4 may expose as datetime picker.

## 2. AssignmentSlot (NEW)

```prisma
// Roster-bound slot on an assignment board. One row per (boardId, studentId)
// snapshot at board creation time. v1 hard-caps boardId.slots.count ≤ 30.
model AssignmentSlot {
  id               String   @id @default(cuid())
  boardId          String
  studentId        String                                       // snapshot FK
  slotNumber       Int                                          // Student.number snapshot (see Q6)
  cardId           String   @unique                             // pre-created empty Card
  submissionStatus String   @default("assigned")                 // assigned|submitted|viewed|returned|reviewed|orphaned
  gradingStatus    String   @default("not_graded")               // not_graded|graded|released
  grade            String?                                       // short label e.g. "A+", "92"
  viewedAt         DateTime?
  returnedAt       DateTime?
  returnReason     String?                                       // ≤200 chars, required on returned transition
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  board            Board                @relation(fields: [boardId], references: [id], onDelete: Cascade)
  student          Student              @relation("StudentAssignmentSlots", fields: [studentId], references: [id], onDelete: Restrict)
  card             Card                 @relation("AssignmentSlotCard", fields: [cardId], references: [id], onDelete: Restrict)
  submission       Submission?          // back-ref via Submission.assignmentSlotId

  @@unique([boardId, studentId])        // one slot per (board, student)
  @@unique([boardId, slotNumber])       // deterministic 5x6 ordering
  @@index([studentId])
}
```

### Why each index
- `@@unique([boardId, studentId])` — prevents duplicate slots on roster-sync race.
- `@@unique([boardId, slotNumber])` — guarantees deterministic grid position.
- `@@index([studentId])` — parent viewer lookup (`/parent/child/[id]/assignment`) and student-owned scope queries.

### onDelete semantics
- `student @onDelete:Restrict` — prevents accidental Student hard-delete from orphaning slots silently. Soft-delete path sets `submissionStatus="orphaned"` via API (not cascade).
- `card @onDelete:Restrict` — prevents Card hard-delete from breaking slot. Both live-delete together via transaction.
- `board @onDelete:Cascade` — teacher board delete cascades slots (acceptable v1; data recovery via Board.deletedAt soft-delete if we add it — currently Board has no soft-delete, so teacher "delete board" really deletes).

### New relations added to existing models

**Student** (add relation):
```prisma
model Student {
  // … existing fields …
  assignmentSlots AssignmentSlot[] @relation("StudentAssignmentSlots")
}
```

**Card** (add relation):
```prisma
model Card {
  // … existing fields …
  assignmentSlot  AssignmentSlot? @relation("AssignmentSlotCard")
}
```

**Board** (add relation): already shown in §1.

## 3. Submission (ALTER)

```prisma
model Submission {
  // … existing fields unchanged …

  // ── Assignment-slot linkage (AB-1) ─────────────────────────────────
  // Nullable for backward-compat with event-signup submissions that never
  // had a slot. When present, uniquely pins one Submission to one slot so
  // student overwrites in-place (no history, decisions Q2).
  assignmentSlotId String? @unique
  assignmentSlot   AssignmentSlot? @relation(fields: [assignmentSlotId], references: [id], onDelete: SetNull)
}
```

### Nullable rationale
- Event-signup submissions (~existing ES-1 rows) remain valid with `assignmentSlotId=null`.
- @unique enforces "one submission per slot" at DB level. Upsert-by-slot in `/api/assignment-slots/[id]/submission`.

## 4. Card (unchanged schema, expanded usage)

No new columns. Reuse:
- `studentAuthorId` — set on pre-created cards at board creation time (slot.studentId).
- `externalAuthorName` — copy of `student.name` for display.
- `x/y` — computed at creation: `col*W, row*H` (col = (slotNumber-1) % 5, row = floor((slotNumber-1)/5)). width/height defaults (240/160) OK; CSS grid overrides on render.
- `imageUrl` — student-uploaded image for thumbnail display. `_thumb_160x120.webp` URL derived via `blob.ts` helper.
- `content`, `linkUrl`, `fileUrl` — submission body.

## 5. Migration SQL (scaffold)

`prisma/migrations/20260414_add_assignment_slot/migration.sql`:

```sql
-- Board extensions
ALTER TABLE "Board" ADD COLUMN "assignmentGuideText" TEXT DEFAULT '';
ALTER TABLE "Board" ADD COLUMN "assignmentAllowLate" BOOLEAN DEFAULT true;
ALTER TABLE "Board" ADD COLUMN "assignmentDeadline" TIMESTAMP(3);

-- Submission FK
ALTER TABLE "Submission" ADD COLUMN "assignmentSlotId" TEXT;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_assignmentSlotId_key" UNIQUE ("assignmentSlotId");

-- AssignmentSlot table
CREATE TABLE "AssignmentSlot" (
    "id"               TEXT PRIMARY KEY,
    "boardId"          TEXT NOT NULL,
    "studentId"        TEXT NOT NULL,
    "slotNumber"       INTEGER NOT NULL,
    "cardId"           TEXT NOT NULL,
    "submissionStatus" TEXT NOT NULL DEFAULT 'assigned',
    "gradingStatus"    TEXT NOT NULL DEFAULT 'not_graded',
    "grade"            TEXT,
    "viewedAt"         TIMESTAMP(3),
    "returnedAt"       TIMESTAMP(3),
    "returnReason"     TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "AssignmentSlot_boardId_studentId_key"  ON "AssignmentSlot"("boardId","studentId");
CREATE UNIQUE INDEX "AssignmentSlot_boardId_slotNumber_key" ON "AssignmentSlot"("boardId","slotNumber");
CREATE UNIQUE INDEX "AssignmentSlot_cardId_key"             ON "AssignmentSlot"("cardId");
CREATE INDEX        "AssignmentSlot_studentId_idx"          ON "AssignmentSlot"("studentId");

ALTER TABLE "AssignmentSlot" ADD CONSTRAINT "AssignmentSlot_boardId_fkey"
  FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE;
ALTER TABLE "AssignmentSlot" ADD CONSTRAINT "AssignmentSlot_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT;
ALTER TABLE "AssignmentSlot" ADD CONSTRAINT "AssignmentSlot_cardId_fkey"
  FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_assignmentSlotId_fkey"
  FOREIGN KEY ("assignmentSlotId") REFERENCES "AssignmentSlot"("id") ON DELETE SET NULL;
```

## 6. RLS scaffold (not applied)

`prisma/migrations/20260414_add_assignment_slot/rls.sql`:
- Content shown in `architecture.md` §9.3.
- Comment block at top: `-- NOT AUTO-APPLIED. See PV-12 pattern.`

## 7. Enum値 lock-down

Until Prisma native enums (we use string columns for portability — pattern matches schema.prisma comment "Avoid SQLite-specific types" even though we're on postgres now):

```ts
// src/lib/assignment-schemas.ts (phase7 creates)
export const SUBMISSION_STATUS = [
  "assigned", "submitted", "viewed", "returned", "reviewed", "orphaned"
] as const;
export const GRADING_STATUS = [
  "not_graded", "graded", "released"
] as const;
```

Zod:
```ts
z.enum(SUBMISSION_STATUS)
z.enum(GRADING_STATUS)
```

## 8. Data-volume estimate
- 30 slots × 1 board = 30 AssignmentSlot + 30 Card rows per board.
- 교사 1명이 연간 ~60 assignment 보드 가정 → 1800 slot/교사/년. 10만 교사 → 180M row. 인덱스 3개 포함 — 평범한 PostgreSQL 처리 범위. partitioning 불필요 (v1).
