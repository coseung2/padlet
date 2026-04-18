-- parent-class-invite-v2 — Path A: drop v1 ParentInviteCode + create
-- ClassInviteCode + extend ParentChildLink with status / audit columns.
-- Applied manually after phase7 review (do NOT run `prisma migrate dev`).
--
-- Preconditions verified by phase2 scope:
--   • ParentInviteCode row count = 0 (safe to DROP)
--   • ParentChildLink row count = 0 (safe to ALTER without backfill)
--
-- Rollback plan lives at phase3/architecture.md §12.

BEGIN;

-- 1. enums ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "ParentLinkStatus" AS ENUM ('pending', 'active', 'rejected', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ParentRejectedReason" AS ENUM (
    'wrong_child', 'not_parent', 'other',
    'code_rotated', 'auto_expired', 'classroom_deleted'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ParentRevokedReason" AS ENUM (
    'teacher_revoked', 'year_end', 'parent_self_leave',
    'rejected_by_teacher', 'auto_expired_pending', 'code_rotated', 'classroom_deleted'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. drop v1 ParentInviteCode (Path A, row count = 0) --------------------
DROP TABLE IF EXISTS "ParentInviteCode" CASCADE;

-- 3. create ClassInviteCode ---------------------------------------------
CREATE TABLE IF NOT EXISTS "ClassInviteCode" (
  "id"          TEXT PRIMARY KEY,
  "classroomId" TEXT NOT NULL REFERENCES "Classroom"("id") ON DELETE CASCADE,
  "code"        TEXT NOT NULL,
  "codeHash"    TEXT NOT NULL,
  "issuedById"  TEXT NOT NULL REFERENCES "User"("id"),
  "expiresAt"   TIMESTAMP(3),
  "maxUses"     INTEGER,
  "rotatedAt"   TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ClassInviteCode_code_key"     ON "ClassInviteCode" ("code");
CREATE UNIQUE INDEX IF NOT EXISTS "ClassInviteCode_codeHash_key" ON "ClassInviteCode" ("codeHash");
CREATE INDEX        IF NOT EXISTS "ClassInviteCode_classroomId_idx" ON "ClassInviteCode" ("classroomId");
CREATE INDEX        IF NOT EXISTS "ClassInviteCode_rotatedAt_idx"   ON "ClassInviteCode" ("rotatedAt");
-- Partial unique: only one active (rotatedAt IS NULL) code per classroom.
CREATE UNIQUE INDEX IF NOT EXISTS "ClassInviteCode_classroomId_active_key"
  ON "ClassInviteCode" ("classroomId") WHERE "rotatedAt" IS NULL;

-- 4. extend ParentChildLink ---------------------------------------------
ALTER TABLE "ParentChildLink"
  ADD COLUMN IF NOT EXISTS "status"         "ParentLinkStatus"        NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "requestedAt"    TIMESTAMP(3)              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "approvedAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approvedById"   TEXT,
  ADD COLUMN IF NOT EXISTS "rejectedAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectedById"   TEXT,
  ADD COLUMN IF NOT EXISTS "rejectedReason" "ParentRejectedReason",
  ADD COLUMN IF NOT EXISTS "revokedAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "revokedById"    TEXT,
  ADD COLUMN IF NOT EXISTS "revokedReason"  "ParentRevokedReason";

DO $$ BEGIN
  ALTER TABLE "ParentChildLink"
    ADD CONSTRAINT "ParentChildLink_approvedById_fkey"
      FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ParentChildLink"
    ADD CONSTRAINT "ParentChildLink_rejectedById_fkey"
      FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ParentChildLink"
    ADD CONSTRAINT "ParentChildLink_revokedById_fkey"
      FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- Backfill existing v1 rows. v1 era represented active access as
-- (row exists AND deletedAt IS NULL); default status='pending' from the
-- ADD COLUMN above would regress those parents to "pending" and either
-- break their access or create a security gap (pending rows treated as
-- active by parent-scope.ts "deletedAt IS NULL" filter).
UPDATE "ParentChildLink"
SET "status" = 'active',
    "approvedAt" = COALESCE("approvedAt", "createdAt")
WHERE "status" = 'pending' AND "deletedAt" IS NULL;

UPDATE "ParentChildLink"
SET "status" = 'revoked',
    "revokedAt" = COALESCE("revokedAt", "deletedAt"),
    "revokedReason" = 'classroom_deleted'
WHERE "status" = 'pending' AND "deletedAt" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "ParentChildLink_status_requestedAt_idx"
  ON "ParentChildLink" ("status", "requestedAt");

COMMIT;
