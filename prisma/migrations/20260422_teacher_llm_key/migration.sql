-- Teacher LLM API key store (Seed 13 follow-up, 2026-04-22).
-- One row per teacher User; stores AES-256-GCM encrypted Claude/OpenAI/Gemini key.

CREATE TABLE "TeacherLlmKey" (
    "userId"     TEXT        NOT NULL,
    "provider"   TEXT        NOT NULL,
    "apiKeyEnc"  TEXT        NOT NULL,
    "last4"      TEXT        NOT NULL,
    "verified"   BOOLEAN     NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "lastError"  TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherLlmKey_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "TeacherLlmKey"
    ADD CONSTRAINT "TeacherLlmKey_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
