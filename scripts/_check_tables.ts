import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const rows: any = await p.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('Parent','ParentChildLink','ParentInviteCode','ParentSession',
                         'StudentAsset','AssetAttachment',
                         'OAuthClient','OAuthAuthCode','OAuthAccessToken','OAuthRefreshToken')
    ORDER BY table_name;
  `);
  console.log("Tables present:");
  for (const r of rows) console.log(" -", r.table_name);
  const mig: any = await p.$queryRawUnsafe(`
    SELECT migration_name, finished_at IS NOT NULL as applied
    FROM _prisma_migrations ORDER BY started_at DESC LIMIT 10;
  `);
  console.log("\nRecent _prisma_migrations entries:");
  for (const m of mig) console.log(" -", m.migration_name, "applied=", m.applied);
}
main().finally(() => p.$disconnect());
