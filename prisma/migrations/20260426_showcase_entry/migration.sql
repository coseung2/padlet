-- student-portfolio (2026-04-26)
-- 학생이 자기 카드를 학급 메인화면 자랑해요 영역에 띄울지 옵트인 토글.
-- 한 학생 한 카드 1슬롯(@@unique([cardId, studentId])). 학생당 자랑해요
-- 한도(현재 N=3)는 application-level COUNT 트랜잭션으로 enforce.

CREATE TABLE "ShowcaseEntry" (
    "id"          TEXT         NOT NULL,
    "cardId"      TEXT         NOT NULL,
    "studentId"   TEXT         NOT NULL,
    "classroomId" TEXT         NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShowcaseEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShowcaseEntry_cardId_studentId_key"
    ON "ShowcaseEntry"("cardId", "studentId");
CREATE INDEX "ShowcaseEntry_studentId_idx"
    ON "ShowcaseEntry"("studentId");
CREATE INDEX "ShowcaseEntry_classroomId_createdAt_idx"
    ON "ShowcaseEntry"("classroomId", "createdAt");

ALTER TABLE "ShowcaseEntry"
    ADD CONSTRAINT "ShowcaseEntry_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShowcaseEntry"
    ADD CONSTRAINT "ShowcaseEntry_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
