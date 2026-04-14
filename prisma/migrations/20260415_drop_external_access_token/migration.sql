-- Remove the teacher PAT (aurapat_...) system. Canva app migrated to
-- per-student OAuth tokens (aurastu_...) on 2026-04-14; no third-party
-- integrations were using teacher PATs as of 2026-04-15.
--
-- Destructive: drops the ExternalAccessToken table. No other FK references
-- exist in the schema — User.externalTokens relation was removed in the
-- corresponding Prisma schema edit. Rows inside ExternalAccessToken are
-- lost (revokedAt/lastUsedAt history discarded). Acceptable because the
-- system had no active callers.

DROP TABLE "ExternalAccessToken";
