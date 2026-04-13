import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const cols: any = await p.$queryRawUnsafe(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name='User'
    ORDER BY ordinal_position
  `);
  console.log('User columns:'); for (const c of cols) console.log(' ', c.column_name, c.data_type);
  const user: any = await p.user.findUnique({ where: { id: "cmnugg7cs0000vsya5t37yw0o" } });
  console.log('\nmallagaenge user:', user);
}
main().finally(() => p.$disconnect());
