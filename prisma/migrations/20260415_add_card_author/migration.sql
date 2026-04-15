-- CardAuthor (card-author-multi). Proper N:N join between Card and Student
-- with denormalised displayName. Card.studentAuthorId + Card.externalAuthorName
-- remain as primary (order=0) mirrors for backward-compat; source of truth
-- now lives in CardAuthor rows.
--
-- Non-destructive: additive table + backfill of existing student-authored
-- cards as order=0 rows. Idempotent (NOT EXISTS guard so re-run is safe).

BEGIN;

CREATE TABLE IF NOT EXISTS "CardAuthor" (
  "id"          TEXT PRIMARY KEY,
  "cardId"      TEXT NOT NULL,
  "studentId"   TEXT,
  "displayName" TEXT NOT NULL,
  "order"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "CardAuthor_cardId_studentId_key"
  ON "CardAuthor"("cardId","studentId");
CREATE INDEX IF NOT EXISTS "CardAuthor_cardId_order_idx"
  ON "CardAuthor"("cardId","order");
CREATE INDEX IF NOT EXISTS "CardAuthor_studentId_idx"
  ON "CardAuthor"("studentId");

DO $$ BEGIN
  ALTER TABLE "CardAuthor" ADD CONSTRAINT "CardAuthor_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CardAuthor" ADD CONSTRAINT "CardAuthor_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill: every existing student-authored card gets a primary (order=0)
-- CardAuthor row. Pre-flight check prevents double-insert on re-run.
INSERT INTO "CardAuthor" ("id", "cardId", "studentId", "displayName", "order", "createdAt")
SELECT
  'caut_' || substr(encode(sha256((c."id" || random()::text)::bytea), 'hex'), 1, 20),
  c."id",
  c."studentAuthorId",
  COALESCE(
    NULLIF(c."externalAuthorName", ''),
    (SELECT s."name" FROM "Student" s WHERE s."id" = c."studentAuthorId"),
    'Author'
  ),
  0,
  c."createdAt"
FROM "Card" c
WHERE c."studentAuthorId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "CardAuthor" ca WHERE ca."cardId" = c."id"
  );

COMMIT;
