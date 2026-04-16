-- Assessment MANUAL grading (2026-04-16 follow-up). New nullable
-- column on AssessmentAnswer so teachers can stamp a manual verdict
-- on SHORT/MANUAL kind questions. null = pending, 0 = wrong,
-- maxScore = correct.
--
-- Manual rollback:
--   ALTER TABLE "AssessmentAnswer" DROP COLUMN "manualScore";

ALTER TABLE "AssessmentAnswer" ADD COLUMN "manualScore" INTEGER;
