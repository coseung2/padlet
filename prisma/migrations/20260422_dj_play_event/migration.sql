-- DJ Board 재생 이벤트 로그 (2026-04-22 dj-recap)
-- Card.queueStatus='played' 전환 시 이벤트 1건 기록.
CREATE TABLE "DjPlayEvent" (
  "id"            TEXT NOT NULL,
  "boardId"       TEXT NOT NULL,
  "classroomId"   TEXT NOT NULL,
  "cardId"        TEXT,
  "title"         TEXT NOT NULL,
  "linkUrl"       TEXT,
  "linkImage"     TEXT,
  "videoId"       TEXT,
  "submitterName" TEXT,
  "submitterId"   TEXT,
  "submitterKind" TEXT,
  "durationSec"   INTEGER,
  "playedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DjPlayEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DjPlayEvent_boardId_playedAt_idx" ON "DjPlayEvent"("boardId", "playedAt");
CREATE INDEX "DjPlayEvent_classroomId_playedAt_idx" ON "DjPlayEvent"("classroomId", "playedAt");
CREATE INDEX "DjPlayEvent_videoId_idx" ON "DjPlayEvent"("videoId");

ALTER TABLE "DjPlayEvent" ADD CONSTRAINT "DjPlayEvent_boardId_fkey"
  FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DjPlayEvent" ADD CONSTRAINT "DjPlayEvent_classroomId_fkey"
  FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
