-- Assessment-autograde MVP-0 (2026-04-16 task).
--  5 new tables: AssessmentTemplate / AssessmentQuestion /
--  AssessmentSubmission / AssessmentAnswer / GradebookEntry.
--  All FKs cascade on parent delete so cleaning up a classroom /
--  template / submission doesn't leave orphans. Nullable columns
--  (boardId, submittedAt, autoScore, releasedAt) were chosen so the
--  downstream MVP-1..4 slices can add behavior without re-migrating
--  the existing rows.
--
-- Manual rollback:
--   DROP TABLE "GradebookEntry" CASCADE;
--   DROP TABLE "AssessmentAnswer" CASCADE;
--   DROP TABLE "AssessmentSubmission" CASCADE;
--   DROP TABLE "AssessmentQuestion" CASCADE;
--   DROP TABLE "AssessmentTemplate" CASCADE;

CREATE TABLE "AssessmentTemplate" (
  "id"          TEXT PRIMARY KEY,
  "classroomId" TEXT NOT NULL,
  "boardId"     TEXT,
  "title"       TEXT NOT NULL,
  "durationMin" INTEGER NOT NULL DEFAULT 30,
  "createdById" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssessmentTemplate_classroomId_fkey"
    FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AssessmentTemplate_classroomId_idx" ON "AssessmentTemplate"("classroomId");
CREATE INDEX "AssessmentTemplate_boardId_idx" ON "AssessmentTemplate"("boardId");

CREATE TABLE "AssessmentQuestion" (
  "id"         TEXT PRIMARY KEY,
  "templateId" TEXT NOT NULL,
  "order"      INTEGER NOT NULL,
  "kind"       TEXT NOT NULL,
  "prompt"     TEXT NOT NULL,
  "payload"    JSONB NOT NULL,
  "maxScore"   INTEGER NOT NULL DEFAULT 1,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentQuestion_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "AssessmentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AssessmentQuestion_templateId_order_key" ON "AssessmentQuestion"("templateId","order");
CREATE INDEX "AssessmentQuestion_templateId_idx" ON "AssessmentQuestion"("templateId");

CREATE TABLE "AssessmentSubmission" (
  "id"          TEXT PRIMARY KEY,
  "templateId"  TEXT NOT NULL,
  "studentId"   TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'in_progress',
  "startedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endAt"       TIMESTAMP(3) NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentSubmission_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "AssessmentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssessmentSubmission_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AssessmentSubmission_templateId_studentId_key" ON "AssessmentSubmission"("templateId","studentId");
CREATE INDEX "AssessmentSubmission_templateId_idx" ON "AssessmentSubmission"("templateId");
CREATE INDEX "AssessmentSubmission_studentId_idx" ON "AssessmentSubmission"("studentId");
CREATE INDEX "AssessmentSubmission_status_idx" ON "AssessmentSubmission"("status");

CREATE TABLE "AssessmentAnswer" (
  "id"           TEXT PRIMARY KEY,
  "submissionId" TEXT NOT NULL,
  "questionId"   TEXT NOT NULL,
  "payload"      JSONB NOT NULL,
  "autoScore"    INTEGER,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssessmentAnswer_submissionId_fkey"
    FOREIGN KEY ("submissionId") REFERENCES "AssessmentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssessmentAnswer_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "AssessmentQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AssessmentAnswer_submissionId_questionId_key" ON "AssessmentAnswer"("submissionId","questionId");
CREATE INDEX "AssessmentAnswer_submissionId_idx" ON "AssessmentAnswer"("submissionId");

CREATE TABLE "GradebookEntry" (
  "id"           TEXT PRIMARY KEY,
  "submissionId" TEXT NOT NULL UNIQUE,
  "finalScore"   INTEGER NOT NULL,
  "releasedAt"   TIMESTAMP(3),
  "createdById"  TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GradebookEntry_submissionId_fkey"
    FOREIGN KEY ("submissionId") REFERENCES "AssessmentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "GradebookEntry_releasedAt_idx" ON "GradebookEntry"("releasedAt");
