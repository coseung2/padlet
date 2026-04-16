-- Quiz-extensions task (2026-04-15): two new nullable columns.
--  * difficulty   — "easy" | "medium" | "hard" chosen by the teacher at
--    generation time. Null for rows created before this migration.
--  * parentQuizId — when a teacher clones an existing quiz for reuse we
--    stamp the source Quiz.id here. No FK so deleting the source leaves
--    clones intact (UI shows nothing about the source once it's gone).
-- Both columns are nullable; no data backfill required.
--
-- Manual rollback:
--   ALTER TABLE "Quiz" DROP COLUMN "difficulty", DROP COLUMN "parentQuizId";
--   DROP INDEX IF EXISTS "Quiz_parentQuizId_idx";

ALTER TABLE "Quiz" ADD COLUMN "difficulty" TEXT;
ALTER TABLE "Quiz" ADD COLUMN "parentQuizId" TEXT;

CREATE INDEX "Quiz_parentQuizId_idx" ON "Quiz"("parentQuizId");
