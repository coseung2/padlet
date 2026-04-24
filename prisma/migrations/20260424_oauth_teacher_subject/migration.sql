-- OAuth provider 의 subject 를 student 단일 → student | user 듀얼로 확장.
-- Aura 컴패니언(교사용 별도 웹앱) OAuth 연동을 위한 Aura-board step 1.
--
-- 정책: studentId / userId 중 정확히 하나만 NOT NULL (CHECK 제약). 기존
-- Canva 학생 페어링 row 들은 모두 studentId 만 set 인 상태로 유효.

-- ── OAuthAuthCode ─────────────────────────────────────────────────────
ALTER TABLE "OAuthAuthCode" ALTER COLUMN "studentId" DROP NOT NULL;
ALTER TABLE "OAuthAuthCode" ADD COLUMN "userId" TEXT;
ALTER TABLE "OAuthAuthCode"
    ADD CONSTRAINT "OAuthAuthCode_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OAuthAuthCode"
    ADD CONSTRAINT "OAuthAuthCode_one_subject"
    CHECK (
      ("studentId" IS NOT NULL AND "userId" IS NULL) OR
      ("studentId" IS NULL AND "userId" IS NOT NULL)
    );
CREATE INDEX "OAuthAuthCode_userId_idx" ON "OAuthAuthCode"("userId");

-- ── OAuthAccessToken ──────────────────────────────────────────────────
ALTER TABLE "OAuthAccessToken" ALTER COLUMN "studentId" DROP NOT NULL;
ALTER TABLE "OAuthAccessToken" ADD COLUMN "userId" TEXT;
ALTER TABLE "OAuthAccessToken"
    ADD CONSTRAINT "OAuthAccessToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OAuthAccessToken"
    ADD CONSTRAINT "OAuthAccessToken_one_subject"
    CHECK (
      ("studentId" IS NOT NULL AND "userId" IS NULL) OR
      ("studentId" IS NULL AND "userId" IS NOT NULL)
    );
CREATE INDEX "OAuthAccessToken_userId_idx" ON "OAuthAccessToken"("userId");

-- ── OAuthRefreshToken ─────────────────────────────────────────────────
ALTER TABLE "OAuthRefreshToken" ALTER COLUMN "studentId" DROP NOT NULL;
ALTER TABLE "OAuthRefreshToken" ADD COLUMN "userId" TEXT;
ALTER TABLE "OAuthRefreshToken"
    ADD CONSTRAINT "OAuthRefreshToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OAuthRefreshToken"
    ADD CONSTRAINT "OAuthRefreshToken_one_subject"
    CHECK (
      ("studentId" IS NOT NULL AND "userId" IS NULL) OR
      ("studentId" IS NULL AND "userId" IS NOT NULL)
    );
CREATE INDEX "OAuthRefreshToken_userId_idx" ON "OAuthRefreshToken"("userId");
