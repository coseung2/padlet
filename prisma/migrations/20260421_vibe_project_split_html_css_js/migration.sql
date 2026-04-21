-- Vibe studio 3-tab split (2026-04-21)
-- htmlContent의 의미를 <body> 본문으로 축소하고 cssContent/jsContent 컬럼을 신설.
-- 기존 레코드는 cssContent/jsContent가 ""로 자동 backfill되어 단일-HTML 렌더가 유지됨.

ALTER TABLE "VibeProject"
  ADD COLUMN "cssContent" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "jsContent"  TEXT NOT NULL DEFAULT '';
