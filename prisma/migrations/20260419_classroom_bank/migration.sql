-- Classroom Bank (classroom-bank feature, 2026-04-19)
-- 7 new tables + 2 ClassroomRoleDef seed rows.
-- default ClassroomRolePermission seed is app-layer lazy (학급 첫 방문 시).

-- ── 1. ClassroomCurrency ──────────────────────────────────────────
CREATE TABLE "ClassroomCurrency" (
    "classroomId" TEXT NOT NULL,
    "unitLabel" TEXT NOT NULL DEFAULT '원',
    "monthlyInterestRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassroomCurrency_pkey" PRIMARY KEY ("classroomId")
);

ALTER TABLE "ClassroomCurrency" ADD CONSTRAINT "ClassroomCurrency_classroomId_fkey"
    FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 2. StudentAccount ─────────────────────────────────────────────
CREATE TABLE "StudentAccount" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentAccount_studentId_key" ON "StudentAccount"("studentId");
CREATE INDEX "StudentAccount_classroomId_idx" ON "StudentAccount"("classroomId");

ALTER TABLE "StudentAccount" ADD CONSTRAINT "StudentAccount_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentAccount" ADD CONSTRAINT "StudentAccount_classroomId_fkey"
    FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 3. StudentCard ────────────────────────────────────────────────
CREATE TABLE "StudentCard" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "qrSecret" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentCard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentCard_accountId_key" ON "StudentCard"("accountId");
CREATE UNIQUE INDEX "StudentCard_cardNumber_key" ON "StudentCard"("cardNumber");

ALTER TABLE "StudentCard" ADD CONSTRAINT "StudentCard_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "StudentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 4. StoreItem ──────────────────────────────────────────────────
CREATE TABLE "StoreItem" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "stock" INTEGER,
    "imageUrl" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StoreItem_classroomId_archived_idx" ON "StoreItem"("classroomId", "archived");

ALTER TABLE "StoreItem" ADD CONSTRAINT "StoreItem_classroomId_fkey"
    FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 5. FixedDeposit ───────────────────────────────────────────────
CREATE TABLE "FixedDeposit" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "principal" INTEGER NOT NULL,
    "monthlyRate" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maturityDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "maturedAt" TIMESTAMP(3),
    "openedById" TEXT NOT NULL,
    "openedByKind" TEXT NOT NULL,

    CONSTRAINT "FixedDeposit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FixedDeposit_accountId_status_idx" ON "FixedDeposit"("accountId", "status");
CREATE INDEX "FixedDeposit_maturityDate_status_idx" ON "FixedDeposit"("maturityDate", "status");

ALTER TABLE "FixedDeposit" ADD CONSTRAINT "FixedDeposit_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "StudentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 6. Transaction ────────────────────────────────────────────────
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "note" TEXT,
    "storeItemId" TEXT,
    "fixedDepositId" TEXT,
    "performedById" TEXT NOT NULL,
    "performedByKind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Transaction_accountId_createdAt_idx" ON "Transaction"("accountId", "createdAt");
CREATE INDEX "Transaction_fixedDepositId_idx" ON "Transaction"("fixedDepositId");

ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "StudentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_storeItemId_fkey"
    FOREIGN KEY ("storeItemId") REFERENCES "StoreItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_fixedDepositId_fkey"
    FOREIGN KEY ("fixedDepositId") REFERENCES "FixedDeposit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 7. ClassroomRolePermission ────────────────────────────────────
CREATE TABLE "ClassroomRolePermission" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "roleKey" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ClassroomRolePermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassroomRolePermission_classroomId_roleKey_permission_key"
    ON "ClassroomRolePermission"("classroomId", "roleKey", "permission");
CREATE INDEX "ClassroomRolePermission_classroomId_roleKey_idx"
    ON "ClassroomRolePermission"("classroomId", "roleKey");

ALTER TABLE "ClassroomRolePermission" ADD CONSTRAINT "ClassroomRolePermission_classroomId_fkey"
    FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 8. Seed ClassroomRoleDef (banker, store-clerk) ────────────────
-- idempotent (WHERE NOT EXISTS)
INSERT INTO "ClassroomRoleDef" ("id", "key", "labelKo", "emoji", "description")
SELECT 'banker_seed_id', 'banker', '은행원', '💰',
       '학급 은행 입출금·적금 가입·중도해지를 처리하는 역할'
WHERE NOT EXISTS (SELECT 1 FROM "ClassroomRoleDef" WHERE "key" = 'banker');

INSERT INTO "ClassroomRoleDef" ("id", "key", "labelKo", "emoji", "description")
SELECT 'store_clerk_seed_id', 'store-clerk', '매점원', '🏪',
       '학급 매점 상품을 관리하고 카드 결제를 처리하는 역할'
WHERE NOT EXISTS (SELECT 1 FROM "ClassroomRoleDef" WHERE "key" = 'store-clerk');
