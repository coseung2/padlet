import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const rows: any = await p.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name LIKE 'OAuth%'
    ORDER BY table_name;
  `);
  console.log("OAuth tables:");
  for (const r of rows) console.log(" -", r.table_name);
  const c: any = await p.$queryRawUnsafe(`SELECT COUNT(*) as n FROM "OAuthClient"`);
  console.log("OAuthClient rows:", c[0].n);
}
main().finally(() => p.$disconnect());
