-- shared-column-sort (2026-04-20)
-- 교사가 선택한 칼럼 정렬 모드를 DB에 저장해 학생 화면도 동기화.

ALTER TABLE "Section" ADD COLUMN "sortMode" TEXT;
