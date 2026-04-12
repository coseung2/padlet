-- PV-1: Row-Level Security policies for Parent Viewer Access.
--
-- STATUS: NOT AUTO-APPLIED. This file is a scaffold. Supabase RLS must be
-- enabled manually via the Supabase dashboard or `psql`. See
-- tasks/2026-04-12-parent-viewer-access/phase10/deploy_log.md for the
-- decision to defer application until PV-12 E2E hardening, OR apply ahead
-- via `psql "$DATABASE_URL" -f prisma/migrations/20260412_add_parent_viewer/rls.sql`.
--
-- The middleware layer (`src/lib/parent-scope.ts`) enforces the same
-- constraints at the application level. RLS is a defence-in-depth backstop.
--
-- Uses a session-GUC pattern: the API layer SET LOCAL app.parent_id = '...'
-- inside a transaction before running queries, and RLS checks against it.
-- NOTE: Prisma does not propagate SET LOCAL across its pool; to enable RLS
-- in production, switch the /parent/* queries to `prisma.$transaction(async tx => {
--   await tx.$executeRaw`SELECT set_config('app.parent_id', ${parentId}, true)`;
--   ... tx.parentChildLink.findMany(...) ...
-- })`.

-- Parent: a parent can only see its own row.
ALTER TABLE "Parent" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parent_self_select" ON "Parent";
CREATE POLICY "Parent_self_select"
  ON "Parent"
  FOR SELECT
  USING ("id" = current_setting('app.parent_id', true));

-- ParentChildLink: unidirectional — parent sees only its own links.
-- A parentA session must NOT be able to discover parentB's link (→ 404).
ALTER TABLE "ParentChildLink" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ParentChildLink_self_select" ON "ParentChildLink";
CREATE POLICY "ParentChildLink_self_select"
  ON "ParentChildLink"
  FOR SELECT
  USING ("parentId" = current_setting('app.parent_id', true));

-- ParentSession: a parent can only see its own sessions (for PV-11 revoke-all).
ALTER TABLE "ParentSession" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ParentSession_self_select" ON "ParentSession";
CREATE POLICY "ParentSession_self_select"
  ON "ParentSession"
  FOR SELECT
  USING ("parentId" = current_setting('app.parent_id', true));

-- ParentInviteCode: parents never read invite codes directly (only teachers
-- via server-side, which bypasses RLS by not setting app.parent_id).
-- Left WITHOUT RLS so teacher-scoped server routes keep working unchanged.
-- Future PV-11/PV-12 may add a teacher GUC for symmetric defence.
