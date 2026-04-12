-- Add missing indexes on frequently-queried foreign key columns.
-- Diagnosed in tasks/2026-04-12-server-query-perf/phase1/diagnosis.md §3-4

-- NextAuth session/account lookups happen on every authenticated request.
-- Without these indexes PostgreSQL falls back to sequential scans once the
-- user base grows beyond a few rows.
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

-- Card.authorId is used for author-scoped filtering (e.g. "cards I wrote").
CREATE INDEX IF NOT EXISTS "Card_authorId_idx" ON "Card"("authorId");
