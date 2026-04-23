-- Question Board (QB-1) — 2026-04-23
-- layout="question-board" 레이아웃용 스키마.
-- 1) Board 에 교사 설정 컬럼 2개 추가 (기존 행은 기본값 자동 적용)
-- 2) BoardResponse 테이블 신규 — 학생/교사 텍스트 응답 저장

-- 1) Board columns
ALTER TABLE "Board"
  ADD COLUMN "questionPrompt"  TEXT,
  ADD COLUMN "questionVizMode" TEXT NOT NULL DEFAULT 'word-cloud';

-- 2) BoardResponse
CREATE TABLE "BoardResponse" (
  "id"         TEXT NOT NULL,
  "boardId"    TEXT NOT NULL,
  "studentId"  TEXT,
  "userId"     TEXT,
  "text"       TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BoardResponse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BoardResponse_boardId_createdAt_idx"
  ON "BoardResponse" ("boardId", "createdAt");

CREATE INDEX "BoardResponse_boardId_studentId_idx"
  ON "BoardResponse" ("boardId", "studentId");

ALTER TABLE "BoardResponse"
  ADD CONSTRAINT "BoardResponse_boardId_fkey"
    FOREIGN KEY ("boardId")   REFERENCES "Board"("id")   ON DELETE CASCADE  ON UPDATE CASCADE,
  ADD CONSTRAINT "BoardResponse_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "BoardResponse_userId_fkey"
    FOREIGN KEY ("userId")    REFERENCES "User"("id")    ON DELETE SET NULL ON UPDATE CASCADE;
