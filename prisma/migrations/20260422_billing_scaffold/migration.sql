-- Billing scaffold (Seed 14, 2026-04-22).
-- TeacherSubscription = 1 row per teacher (userId PK, 1:1 with User).
-- PaymentEvent        = audit log of every charge/refund/webhook.

CREATE TABLE "TeacherSubscription" (
    "userId"             TEXT        NOT NULL,
    "plan"               TEXT        NOT NULL DEFAULT 'free',
    "status"             TEXT        NOT NULL DEFAULT 'active',
    "pgProvider"         TEXT        NOT NULL DEFAULT 'toss',
    "pgCustomerKey"      TEXT,
    "pgBillingKey"       TEXT,
    "pgBillingKeyLast4"  TEXT,
    "amount"             INTEGER     NOT NULL DEFAULT 0,
    "currency"           TEXT        NOT NULL DEFAULT 'KRW',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd"   TIMESTAMP(3),
    "canceledAt"         TIMESTAMP(3),
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherSubscription_pkey" PRIMARY KEY ("userId")
);

CREATE UNIQUE INDEX "TeacherSubscription_pgCustomerKey_key"
    ON "TeacherSubscription"("pgCustomerKey");

ALTER TABLE "TeacherSubscription"
    ADD CONSTRAINT "TeacherSubscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PaymentEvent" (
    "id"             TEXT        NOT NULL,
    "userId"         TEXT        NOT NULL,
    "subscriptionId" TEXT,
    "type"           TEXT        NOT NULL,
    "amount"         INTEGER     NOT NULL DEFAULT 0,
    "currency"       TEXT        NOT NULL DEFAULT 'KRW',
    "status"         TEXT        NOT NULL DEFAULT 'pending',
    "pgOrderId"      TEXT,
    "pgPaymentKey"   TEXT,
    "rawPayload"     JSONB,
    "errorMessage"   TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentEvent_pgOrderId_key" ON "PaymentEvent"("pgOrderId");
CREATE INDEX "PaymentEvent_userId_createdAt_idx" ON "PaymentEvent"("userId", "createdAt");
CREATE INDEX "PaymentEvent_subscriptionId_idx" ON "PaymentEvent"("subscriptionId");

ALTER TABLE "PaymentEvent"
    ADD CONSTRAINT "PaymentEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentEvent"
    ADD CONSTRAINT "PaymentEvent_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "TeacherSubscription"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
