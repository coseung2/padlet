import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const all = await p.board.findMany({ select: { id: true, slug: true, layout: true } });
  console.log("all boards count:", all.length);
  for (const b of all) console.log("-", b.layout, b.slug);
  const ev = all.filter(b => b.layout === "event-signup");
  console.log("\nevent-signup boards:", ev.length);
  for (const b of ev) {
    const row = await p.board.findUnique({ where: { id: b.id } });
    console.log("  ", b.slug, "accessMode=", row?.accessMode, "hasToken=", !!row?.accessToken);
  }
  await p.$disconnect();
})();
