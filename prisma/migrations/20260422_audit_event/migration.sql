-- AuditEvent (Seed 14 security, 2026-04-22).
-- 권한 있는 행동 감사 추적. Slack 알림과 병행 — Slack은 휘발, DB는 영구.

CREATE TABLE "AuditEvent" (
    "id"           TEXT        NOT NULL,
    "actorType"    TEXT        NOT NULL,
    "actorId"      TEXT,
    "action"       TEXT        NOT NULL,
    "resourceType" TEXT,
    "resourceId"   TEXT,
    "metadata"     JSONB,
    "ip"           TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditEvent_actorType_actorId_createdAt_idx"
    ON "AuditEvent"("actorType", "actorId", "createdAt");

CREATE INDEX "AuditEvent_action_createdAt_idx"
    ON "AuditEvent"("action", "createdAt");

CREATE INDEX "AuditEvent_resourceType_resourceId_idx"
    ON "AuditEvent"("resourceType", "resourceId");
