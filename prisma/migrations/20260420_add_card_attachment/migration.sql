-- multi-attachment (2026-04-20)
-- 카드 1개에 여러 이미지/동영상/파일을 붙이기 위한 정규화 테이블.
-- Card의 기존 imageUrl/videoUrl/fileUrl 단일 필드는 무변경 (fallback 렌더).

CREATE TABLE "CardAttachment" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CardAttachment_cardId_idx" ON "CardAttachment"("cardId");

ALTER TABLE "CardAttachment" ADD CONSTRAINT "CardAttachment_cardId_fkey"
    FOREIGN KEY ("cardId") REFERENCES "Card"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
