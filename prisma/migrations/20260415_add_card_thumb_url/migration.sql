-- Adds Card.thumbUrl so assignment-board slots (AC-12) can serve a
-- 160×120 WebP thumbnail without re-downloading the full imageUrl. The
-- column is nullable — existing rows stay untouched and slotRowToDTO
-- falls back to imageUrl when thumbUrl is null, so this migration is
-- non-destructive and backward compatible.

ALTER TABLE "Card" ADD COLUMN "thumbUrl" TEXT;
