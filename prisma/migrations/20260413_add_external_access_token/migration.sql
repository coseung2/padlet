-- P0-② Content Publisher: Personal Access Token for external content publishing.
-- Hash-at-rest storage (never store plaintext). Soft-delete via `revokedAt`.

CREATE TABLE "ExternalAccessToken" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "tokenHash"  TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt"  TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalAccessToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalAccessToken_tokenHash_key" ON "ExternalAccessToken" ("tokenHash");
CREATE INDEX "ExternalAccessToken_userId_idx" ON "ExternalAccessToken" ("userId");

ALTER TABLE "ExternalAccessToken"
  ADD CONSTRAINT "ExternalAccessToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
