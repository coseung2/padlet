-- Maps Canva user IDs (from @canva/user getCanvaUserToken JWT `sub`) to
-- Aura-board Student rows. Populated during OAuth consent when the
-- student authorizes the Canva app. Backend uses this table to resolve
-- Canva JWT Bearer tokens to a student for /api/external/* routes.
CREATE TABLE "CanvaAppLink" (
    "canvaUserId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'cards:write',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CanvaAppLink_pkey" PRIMARY KEY ("canvaUserId")
);

CREATE UNIQUE INDEX "CanvaAppLink_studentId_key" ON "CanvaAppLink"("studentId");
CREATE INDEX "CanvaAppLink_studentId_idx" ON "CanvaAppLink"("studentId");

ALTER TABLE "CanvaAppLink" ADD CONSTRAINT "CanvaAppLink_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
