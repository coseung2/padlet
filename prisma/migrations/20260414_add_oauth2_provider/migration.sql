-- OAuth 2.0 Provider schema (Session 1 backend-only).
-- Canva Content Publisher app will exchange authorization codes from
-- /oauth/authorize for student-scoped access + refresh tokens, replacing
-- the shared teacher PAT bundled into the Canva app binary.
--
-- This migration is safe to apply on production: all tables are new and
-- the Student model additions are optional back-relations (Prisma-side
-- only — no column changes).

CREATE TABLE "OAuthClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "redirectUris" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "pkceRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OAuthAuthCode" (
    "code" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    "codeChallengeMethod" TEXT NOT NULL DEFAULT 'S256',
    "state" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAuthCode_pkey" PRIMARY KEY ("code")
);

CREATE INDEX "OAuthAuthCode_studentId_idx" ON "OAuthAuthCode"("studentId");
CREATE INDEX "OAuthAuthCode_clientId_idx" ON "OAuthAuthCode"("clientId");
CREATE INDEX "OAuthAuthCode_expiresAt_idx" ON "OAuthAuthCode"("expiresAt");

CREATE TABLE "OAuthAccessToken" (
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "refreshTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "OAuthAccessToken_pkey" PRIMARY KEY ("tokenHash")
);

CREATE UNIQUE INDEX "OAuthAccessToken_tokenPrefix_key" ON "OAuthAccessToken"("tokenPrefix");
CREATE INDEX "OAuthAccessToken_tokenPrefix_idx" ON "OAuthAccessToken"("tokenPrefix");
CREATE INDEX "OAuthAccessToken_studentId_idx" ON "OAuthAccessToken"("studentId");
CREATE INDEX "OAuthAccessToken_expiresAt_idx" ON "OAuthAccessToken"("expiresAt");

CREATE TABLE "OAuthRefreshToken" (
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "parentTokenHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthRefreshToken_pkey" PRIMARY KEY ("tokenHash")
);

CREATE UNIQUE INDEX "OAuthRefreshToken_tokenPrefix_key" ON "OAuthRefreshToken"("tokenPrefix");
CREATE INDEX "OAuthRefreshToken_tokenPrefix_idx" ON "OAuthRefreshToken"("tokenPrefix");
CREATE INDEX "OAuthRefreshToken_studentId_idx" ON "OAuthRefreshToken"("studentId");
CREATE INDEX "OAuthRefreshToken_expiresAt_idx" ON "OAuthRefreshToken"("expiresAt");

-- Foreign keys
ALTER TABLE "OAuthAuthCode" ADD CONSTRAINT "OAuthAuthCode_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OAuthAuthCode" ADD CONSTRAINT "OAuthAuthCode_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "OAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OAuthAccessToken" ADD CONSTRAINT "OAuthAccessToken_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OAuthAccessToken" ADD CONSTRAINT "OAuthAccessToken_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "OAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OAuthRefreshToken" ADD CONSTRAINT "OAuthRefreshToken_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OAuthRefreshToken" ADD CONSTRAINT "OAuthRefreshToken_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "OAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
