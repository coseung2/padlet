-- Ollama 로컬 테스트 provider 지원 — TeacherLlmKey에 baseUrl + modelId 추가.
-- 기존 row (claude/openai/gemini) 는 둘 다 null 로 유지.

ALTER TABLE "TeacherLlmKey"
  ADD COLUMN "baseUrl" TEXT,
  ADD COLUMN "modelId" TEXT;
