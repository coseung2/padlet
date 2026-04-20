-- vibe-arcade v1 (Seed 13, 2026-04-20)
-- 학급 Steam — 신규 테이블 6종 + Board.layout enum 확장("vibe-arcade")
-- Board.layout은 String이므로 스키마 SQL 변경 없음 (앱단 zod validation).
-- enabled 필드(VibeArcadeConfig)가 보드별 런칭 게이트 역할 (FeatureFlag 테이블 미신설).

-- ── VibeArcadeConfig (Board 1:1) ───────────────────────────────────────
CREATE TABLE "VibeArcadeConfig" (
    "boardId"                 TEXT NOT NULL,
    "enabled"                 BOOLEAN NOT NULL DEFAULT false,
    "moderationPolicy"        TEXT NOT NULL DEFAULT 'teacher_approval_required',
    "perStudentDailyTokenCap" INTEGER DEFAULT 45000,
    "classroomDailyTokenPool" INTEGER NOT NULL DEFAULT 1500000,
    "crossClassroomVisible"   BOOLEAN NOT NULL DEFAULT false,
    "reviewAuthorDisplay"     TEXT NOT NULL DEFAULT 'named',
    "reviewRatingSystem"      TEXT NOT NULL DEFAULT 'stars_1_5',
    "allowRemix"              BOOLEAN NOT NULL DEFAULT false,
    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VibeArcadeConfig_pkey" PRIMARY KEY ("boardId")
);

ALTER TABLE "VibeArcadeConfig"
  ADD CONSTRAINT "VibeArcadeConfig_boardId_fkey"
  FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── VibeProject ────────────────────────────────────────────────────────
CREATE TABLE "VibeProject" (
    "id"               TEXT NOT NULL,
    "boardId"          TEXT NOT NULL,
    "classroomId"      TEXT NOT NULL,
    "authorStudentId"  TEXT NOT NULL,
    "title"            TEXT NOT NULL,
    "description"      TEXT NOT NULL DEFAULT '',
    "htmlContent"      TEXT NOT NULL,
    "thumbnailUrl"     TEXT,
    "tags"             TEXT NOT NULL DEFAULT '[]',
    "moderationStatus" TEXT NOT NULL DEFAULT 'draft',
    "moderationNote"   TEXT,
    "approvedAt"       TIMESTAMP(3),
    "approvedById"     TEXT,
    "rejectedAt"       TIMESTAMP(3),
    "rejectedById"     TEXT,
    "playCount"        INTEGER NOT NULL DEFAULT 0,
    "uniquePlayCount"  INTEGER NOT NULL DEFAULT 0,
    "reviewCount"      INTEGER NOT NULL DEFAULT 0,
    "ratingAvg"        DOUBLE PRECISION,
    "version"          INTEGER NOT NULL DEFAULT 1,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VibeProject_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VibeProject"
  ADD CONSTRAINT "VibeProject_boardId_fkey"
  FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VibeProject"
  ADD CONSTRAINT "VibeProject_authorStudentId_fkey"
  FOREIGN KEY ("authorStudentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "VibeProject_boardId_moderationStatus_idx"
  ON "VibeProject"("boardId", "moderationStatus");
CREATE INDEX "VibeProject_classroomId_moderationStatus_createdAt_idx"
  ON "VibeProject"("classroomId", "moderationStatus", "createdAt");
CREATE INDEX "VibeProject_authorStudentId_idx"
  ON "VibeProject"("authorStudentId");

-- ── VibeSession (Sonnet 대화) ──────────────────────────────────────────
CREATE TABLE "VibeSession" (
    "id"           TEXT NOT NULL,
    "projectId"    TEXT,
    "studentId"    TEXT NOT NULL,
    "classroomId"  TEXT NOT NULL,
    "messages"     JSONB NOT NULL,
    "tokensIn"     INTEGER NOT NULL DEFAULT 0,
    "tokensOut"    INTEGER NOT NULL DEFAULT 0,
    "status"       TEXT NOT NULL DEFAULT 'active',
    "startedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt"      TIMESTAMP(3),
    "refusalCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VibeSession_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VibeSession"
  ADD CONSTRAINT "VibeSession_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "VibeProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VibeSession"
  ADD CONSTRAINT "VibeSession_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "VibeSession_projectId_idx" ON "VibeSession"("projectId");
CREATE INDEX "VibeSession_studentId_startedAt_idx" ON "VibeSession"("studentId", "startedAt");
CREATE INDEX "VibeSession_classroomId_startedAt_idx" ON "VibeSession"("classroomId", "startedAt");

-- ── VibeReview (학생 1인 1리뷰) ────────────────────────────────────────
CREATE TABLE "VibeReview" (
    "id"                TEXT NOT NULL,
    "projectId"         TEXT NOT NULL,
    "reviewerStudentId" TEXT NOT NULL,
    "rating"            INTEGER NOT NULL,
    "comment"           TEXT NOT NULL DEFAULT '',
    "moderationStatus"  TEXT NOT NULL DEFAULT 'visible',
    "flagCount"         INTEGER NOT NULL DEFAULT 0,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VibeReview_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VibeReview"
  ADD CONSTRAINT "VibeReview_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "VibeProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VibeReview"
  ADD CONSTRAINT "VibeReview_reviewerStudentId_fkey"
  FOREIGN KEY ("reviewerStudentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "VibeReview_projectId_reviewerStudentId_key"
  ON "VibeReview"("projectId", "reviewerStudentId");
CREATE INDEX "VibeReview_projectId_idx" ON "VibeReview"("projectId");
CREATE INDEX "VibeReview_reviewerStudentId_idx" ON "VibeReview"("reviewerStudentId");

-- ── VibePlaySession (플레이 원장) ──────────────────────────────────────
CREATE TABLE "VibePlaySession" (
    "id"            TEXT NOT NULL,
    "projectId"     TEXT NOT NULL,
    "studentId"     TEXT NOT NULL,
    "startedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt"       TIMESTAMP(3),
    "completed"     BOOLEAN NOT NULL DEFAULT false,
    "reportedScore" INTEGER,

    CONSTRAINT "VibePlaySession_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VibePlaySession"
  ADD CONSTRAINT "VibePlaySession_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "VibeProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VibePlaySession"
  ADD CONSTRAINT "VibePlaySession_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "VibePlaySession_projectId_startedAt_idx" ON "VibePlaySession"("projectId", "startedAt");
CREATE INDEX "VibePlaySession_studentId_startedAt_idx" ON "VibePlaySession"("studentId", "startedAt");

-- ── VibeQuotaLedger (일별 rollup) ──────────────────────────────────────
CREATE TABLE "VibeQuotaLedger" (
    "id"            TEXT NOT NULL,
    "classroomId"   TEXT NOT NULL,
    "studentId"     TEXT,
    "date"          TIMESTAMP(3) NOT NULL,
    "tokensIn"      INTEGER NOT NULL DEFAULT 0,
    "tokensOut"     INTEGER NOT NULL DEFAULT 0,
    "sessionsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VibeQuotaLedger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VibeQuotaLedger_classroomId_studentId_date_key"
  ON "VibeQuotaLedger"("classroomId", "studentId", "date");
CREATE INDEX "VibeQuotaLedger_classroomId_date_idx" ON "VibeQuotaLedger"("classroomId", "date");
CREATE INDEX "VibeQuotaLedger_studentId_date_idx" ON "VibeQuotaLedger"("studentId", "date");
