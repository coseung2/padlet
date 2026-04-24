-- AI 평어 (2026-04-24)
-- 교사가 학생별로 AI 평어를 생성·UPSERT 저장. /api/external/feedbacks 로 Aura 가 풀.

CREATE TABLE "AiFeedback" (
    "id"          TEXT         NOT NULL,
    "teacherId"   TEXT         NOT NULL,
    "classroomId" TEXT         NOT NULL,
    "studentId"   TEXT         NOT NULL,
    "subject"     TEXT         NOT NULL,
    "unit"        TEXT         NOT NULL,
    "criterion"   TEXT         NOT NULL,
    "comment"     TEXT         NOT NULL,
    "model"       TEXT         NOT NULL,
    "sentAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiFeedback_studentId_subject_unit_criterion_key"
    ON "AiFeedback"("studentId", "subject", "unit", "criterion");
CREATE INDEX "AiFeedback_classroomId_updatedAt_idx"
    ON "AiFeedback"("classroomId", "updatedAt");
CREATE INDEX "AiFeedback_teacherId_updatedAt_idx"
    ON "AiFeedback"("teacherId", "updatedAt");

ALTER TABLE "AiFeedback"
    ADD CONSTRAINT "AiFeedback_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiFeedback"
    ADD CONSTRAINT "AiFeedback_classroomId_fkey"
    FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiFeedback"
    ADD CONSTRAINT "AiFeedback_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
