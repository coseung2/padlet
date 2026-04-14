-- Assignment-board (AB-1). Non-destructive: all Board/Submission ALTERs add
-- nullable or defaulted columns; no existing rows change behavior. v1 hard-
-- caps boardId.slots.count ≤ 30 enforced at API layer (classroom_too_large).

-- Board extensions
ALTER TABLE "Board" ADD COLUMN "assignmentGuideText" TEXT DEFAULT '';
ALTER TABLE "Board" ADD COLUMN "assignmentAllowLate" BOOLEAN DEFAULT true;
ALTER TABLE "Board" ADD COLUMN "assignmentDeadline" TIMESTAMP(3);

-- Submission FK (nullable — legacy event-signup rows stay valid at NULL).
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
  FOREIGN KEY ("boardId")   REFERENCES "Board"("id")   ON DELETE CASCADE;
ALTER TABLE "AssignmentSlot" ADD CONSTRAINT "AssignmentSlot_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT;
ALTER TABLE "AssignmentSlot" ADD CONSTRAINT "AssignmentSlot_cardId_fkey"
  FOREIGN KEY ("cardId")    REFERENCES "Card"("id")    ON DELETE RESTRICT;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_assignmentSlotId_fkey"
  FOREIGN KEY ("assignmentSlotId") REFERENCES "AssignmentSlot"("id") ON DELETE SET NULL;
