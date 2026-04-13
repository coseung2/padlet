-- CanvaConnectAccount: DB-backed replacement for the in-memory Map used
-- in src/lib/canva.ts (Canva Connect API token store). Ensures that Canva
-- OAuth state + access/refresh tokens survive Vercel Function cold starts.

CREATE TABLE "CanvaConnectAccount" (
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "pkceVerifier" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CanvaConnectAccount_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "CanvaConnectAccount" ADD CONSTRAINT "CanvaConnectAccount_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
