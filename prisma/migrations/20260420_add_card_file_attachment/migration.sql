-- card-file-attachment (2026-04-20)
-- Card 모델에 범용 파일 첨부 필드 4개 추가. 모두 nullable이라 기존 카드 호환.

ALTER TABLE "Card" ADD COLUMN "fileUrl" TEXT;
ALTER TABLE "Card" ADD COLUMN "fileName" TEXT;
ALTER TABLE "Card" ADD COLUMN "fileSize" INTEGER;
ALTER TABLE "Card" ADD COLUMN "fileMimeType" TEXT;
