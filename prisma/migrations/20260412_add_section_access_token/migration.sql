-- Breakout view (T0-①): section-scoped access token.
-- Nullable column; unique when set. PostgreSQL allows multiple NULLs in a
-- UNIQUE index by default, so no partial index needed.
ALTER TABLE "Section" ADD COLUMN "accessToken" TEXT;
CREATE UNIQUE INDEX "Section_accessToken_key" ON "Section" ("accessToken");
