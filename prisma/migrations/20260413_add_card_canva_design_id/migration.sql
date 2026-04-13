-- Adds Card.canvaDesignId so cards published from the Canva Content Publisher
-- app (and successful Canva URL paste resolves) can activate the existing
-- CanvaEmbedSlot's thumbnail+live toggle UX without changing renderers.
-- Nullable + no default → backward compatible with all existing rows.

ALTER TABLE "Card" ADD COLUMN "canvaDesignId" TEXT;
