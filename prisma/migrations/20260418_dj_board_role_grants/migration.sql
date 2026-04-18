-- DJ Board — classroom role system + Card.queueStatus
--
-- 3 new tables (ClassroomRoleDef, BoardLayoutRoleGrant, ClassroomRoleAssignment)
-- + 1 nullable column on Card. All additive; existing data untouched.
--
-- Seed rows for "dj" role + (dj, dj-queue)→owner grant inserted at end so
-- the feature works end-to-end immediately after migrate.
--
-- Manual rollback:
--   DROP TABLE IF EXISTS "ClassroomRoleAssignment";
--   DROP TABLE IF EXISTS "BoardLayoutRoleGrant";
--   DROP TABLE IF EXISTS "ClassroomRoleDef";
--   ALTER TABLE "Card" DROP COLUMN IF EXISTS "queueStatus";

-- ── 1. Card.queueStatus (null = not a queue card) ────────────────────
ALTER TABLE "Card" ADD COLUMN "queueStatus" TEXT;

-- ── 2. ClassroomRoleDef ──────────────────────────────────────────────
CREATE TABLE "ClassroomRoleDef" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "labelKo" TEXT NOT NULL,
    "emoji" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomRoleDef_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClassroomRoleDef_key_key" ON "ClassroomRoleDef"("key");

-- ── 3. BoardLayoutRoleGrant ──────────────────────────────────────────
CREATE TABLE "BoardLayoutRoleGrant" (
    "id" TEXT NOT NULL,
    "classroomRoleId" TEXT NOT NULL,
    "boardLayout" TEXT NOT NULL,
    "grantedRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardLayoutRoleGrant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BoardLayoutRoleGrant_classroomRoleId_boardLayout_key"
    ON "BoardLayoutRoleGrant"("classroomRoleId", "boardLayout");
CREATE INDEX "BoardLayoutRoleGrant_boardLayout_idx"
    ON "BoardLayoutRoleGrant"("boardLayout");
ALTER TABLE "BoardLayoutRoleGrant" ADD CONSTRAINT "BoardLayoutRoleGrant_classroomRoleId_fkey"
    FOREIGN KEY ("classroomRoleId") REFERENCES "ClassroomRoleDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 4. ClassroomRoleAssignment ───────────────────────────────────────
CREATE TABLE "ClassroomRoleAssignment" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classroomRoleId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomRoleAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClassroomRoleAssignment_classroomId_studentId_classroomRoleId_key"
    ON "ClassroomRoleAssignment"("classroomId", "studentId", "classroomRoleId");
CREATE INDEX "ClassroomRoleAssignment_classroomId_classroomRoleId_idx"
    ON "ClassroomRoleAssignment"("classroomId", "classroomRoleId");
CREATE INDEX "ClassroomRoleAssignment_studentId_idx"
    ON "ClassroomRoleAssignment"("studentId");
ALTER TABLE "ClassroomRoleAssignment" ADD CONSTRAINT "ClassroomRoleAssignment_classroomId_fkey"
    FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassroomRoleAssignment" ADD CONSTRAINT "ClassroomRoleAssignment_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassroomRoleAssignment" ADD CONSTRAINT "ClassroomRoleAssignment_classroomRoleId_fkey"
    FOREIGN KEY ("classroomRoleId") REFERENCES "ClassroomRoleDef"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassroomRoleAssignment" ADD CONSTRAINT "ClassroomRoleAssignment_assignedById_fkey"
    FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── 5. Seed DJ role + (dj × dj-queue → owner) grant ──────────────────
-- Idempotent: re-run is a no-op thanks to WHERE NOT EXISTS guards.
INSERT INTO "ClassroomRoleDef" ("id", "key", "labelKo", "emoji", "description")
SELECT 'dj_seed_role_id', 'dj', 'DJ', '🎧',
       'DJ 큐 보드에서 곡 승인·순서 변경·재생을 담당하는 역할'
WHERE NOT EXISTS (SELECT 1 FROM "ClassroomRoleDef" WHERE "key" = 'dj');

INSERT INTO "BoardLayoutRoleGrant" ("id", "classroomRoleId", "boardLayout", "grantedRole")
SELECT 'dj_seed_grant_id',
       (SELECT "id" FROM "ClassroomRoleDef" WHERE "key" = 'dj'),
       'dj-queue', 'owner'
WHERE EXISTS (SELECT 1 FROM "ClassroomRoleDef" WHERE "key" = 'dj')
  AND NOT EXISTS (
    SELECT 1 FROM "BoardLayoutRoleGrant" g
    JOIN "ClassroomRoleDef" d ON g."classroomRoleId" = d."id"
    WHERE d."key" = 'dj' AND g."boardLayout" = 'dj-queue'
  );
