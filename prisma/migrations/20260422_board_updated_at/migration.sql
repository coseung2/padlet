-- Add Board.updatedAt (2026-04-22).
-- @updatedAt Prisma hint — bumps when the Board row itself is updated.
-- Card/Section mutations explicitly touch the parent board in code (see
-- src/app/api/cards/*). Backfill with createdAt so existing boards
-- don't all suddenly look like "new activity".

ALTER TABLE "Board" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Board" SET "updatedAt" = "createdAt";
