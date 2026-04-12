-- Drawpile student-asset library — partial scope (schema only, no server integration yet).
-- Adds:
--   1) StudentAsset: student-owned image (uploaded or Drawpile-produced)
--   2) AssetAttachment: join row linking StudentAsset to Card / PlantObservation
-- Non-destructive. Existing rows untouched. No Board/Card/PlantObservation column drops.

-- ── StudentAsset ─────────────────────────────────────────────────────────
CREATE TABLE "StudentAsset" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "classroomId" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT '',
  "fileUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "width" INTEGER,
  "height" INTEGER,
  "format" TEXT NOT NULL DEFAULT 'image/png',
  "sizeBytes" INTEGER NOT NULL DEFAULT 0,
  "isSharedToClass" BOOLEAN NOT NULL DEFAULT false,
  "source" TEXT NOT NULL DEFAULT 'upload',
  "drawpileFileId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StudentAsset_studentId_idx" ON "StudentAsset"("studentId");
CREATE INDEX "StudentAsset_classroomId_idx" ON "StudentAsset"("classroomId");
CREATE INDEX "StudentAsset_classroomId_isSharedToClass_idx"
  ON "StudentAsset"("classroomId", "isSharedToClass");
ALTER TABLE "StudentAsset" ADD CONSTRAINT "StudentAsset_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AssetAttachment ──────────────────────────────────────────────────────
CREATE TABLE "AssetAttachment" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "cardId" TEXT,
  "observationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AssetAttachment_assetId_idx" ON "AssetAttachment"("assetId");
CREATE INDEX "AssetAttachment_cardId_idx" ON "AssetAttachment"("cardId");
CREATE INDEX "AssetAttachment_observationId_idx" ON "AssetAttachment"("observationId");
ALTER TABLE "AssetAttachment" ADD CONSTRAINT "AssetAttachment_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "StudentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetAttachment" ADD CONSTRAINT "AssetAttachment_cardId_fkey"
  FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetAttachment" ADD CONSTRAINT "AssetAttachment_observationId_fkey"
  FOREIGN KEY ("observationId") REFERENCES "PlantObservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
