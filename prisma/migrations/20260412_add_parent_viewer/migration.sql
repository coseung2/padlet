-- PV-1: Parent Viewer Access — additive only.
-- Tables: Parent, ParentChildLink, ParentInviteCode, ParentSession.
-- Task: 2026-04-12-parent-viewer-access. Seed: seed_37b35654542f.
--
-- This SQL mirrors the Prisma schema for audit. Applied via `prisma db push`
-- (Supabase Postgres). RLS policies live in the sibling `rls.sql` file and are
-- NOT auto-applied — see tasks/.../phase10/deploy_log.md for RLS enablement.

-- Parent ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Parent" (
  "id"               TEXT PRIMARY KEY,
  "email"            TEXT NOT NULL,
  "name"             TEXT NOT NULL,
  "tier"             TEXT NOT NULL DEFAULT 'free',
  "parentDeletedAt"  TIMESTAMP(3),
  "anonymizedAt"     TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "Parent_email_key" ON "Parent" ("email");
CREATE INDEX IF NOT EXISTS "Parent_email_idx"           ON "Parent" ("email");
CREATE INDEX IF NOT EXISTS "Parent_parentDeletedAt_idx" ON "Parent" ("parentDeletedAt");

-- ParentChildLink ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ParentChildLink" (
  "id"        TEXT PRIMARY KEY,
  "parentId"  TEXT NOT NULL REFERENCES "Parent"("id")  ON DELETE CASCADE,
  "studentId" TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX IF NOT EXISTS "ParentChildLink_parentId_studentId_key"
  ON "ParentChildLink" ("parentId", "studentId");
CREATE INDEX IF NOT EXISTS "ParentChildLink_studentId_idx" ON "ParentChildLink" ("studentId");
CREATE INDEX IF NOT EXISTS "ParentChildLink_parentId_idx"  ON "ParentChildLink" ("parentId");
CREATE INDEX IF NOT EXISTS "ParentChildLink_deletedAt_idx" ON "ParentChildLink" ("deletedAt");

-- ParentInviteCode --------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ParentInviteCode" (
  "id"             TEXT PRIMARY KEY,
  "studentId"      TEXT NOT NULL REFERENCES "Student"("id") ON DELETE CASCADE,
  "issuedByUserId" TEXT NOT NULL REFERENCES "User"("id"),
  "code"           TEXT NOT NULL,
  "codeHash"       TEXT NOT NULL,
  "maxUses"        INTEGER NOT NULL DEFAULT 3,
  "usesCount"      INTEGER NOT NULL DEFAULT 0,
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt"      TIMESTAMP(3) NOT NULL,
  "revokedAt"      TIMESTAMP(3),
  "boundToEmail"   TEXT REFERENCES "Parent"("email"),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ParentInviteCode_code_key"     ON "ParentInviteCode" ("code");
CREATE UNIQUE INDEX IF NOT EXISTS "ParentInviteCode_codeHash_key" ON "ParentInviteCode" ("codeHash");
CREATE INDEX IF NOT EXISTS "ParentInviteCode_studentId_idx"    ON "ParentInviteCode" ("studentId");
CREATE INDEX IF NOT EXISTS "ParentInviteCode_expiresAt_idx"    ON "ParentInviteCode" ("expiresAt");
CREATE INDEX IF NOT EXISTS "ParentInviteCode_boundToEmail_idx" ON "ParentInviteCode" ("boundToEmail");

-- ParentSession -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ParentSession" (
  "id"               TEXT PRIMARY KEY,
  "parentId"         TEXT NOT NULL REFERENCES "Parent"("id") ON DELETE CASCADE,
  "sessionToken"     TEXT NOT NULL,
  "tokenHash"        TEXT NOT NULL,
  "userAgent"        TEXT,
  "ipHash"           TEXT,
  "expiresAt"        TIMESTAMP(3) NOT NULL,
  "sessionRevokedAt" TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt"       TIMESTAMP(3)
);
CREATE UNIQUE INDEX IF NOT EXISTS "ParentSession_sessionToken_key" ON "ParentSession" ("sessionToken");
CREATE UNIQUE INDEX IF NOT EXISTS "ParentSession_tokenHash_key"    ON "ParentSession" ("tokenHash");
CREATE INDEX IF NOT EXISTS "ParentSession_parentId_idx"     ON "ParentSession" ("parentId");
CREATE INDEX IF NOT EXISTS "ParentSession_sessionToken_idx" ON "ParentSession" ("sessionToken");
CREATE INDEX IF NOT EXISTS "ParentSession_tokenHash_idx"    ON "ParentSession" ("tokenHash");
CREATE INDEX IF NOT EXISTS "ParentSession_expiresAt_idx"    ON "ParentSession" ("expiresAt");
