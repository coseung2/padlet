/**
 * Smoke test for POST /api/external/cards (Seed 8 CR-10).
 *
 * Usage:
 *   AURA_BASE=http://localhost:3000 USER_ID=u_owner BOARD_ID=<cuid> \
 *     AURA_PAT_PEPPER=<32chars> npx tsx scripts/test-external-cards.ts
 *
 * Steps:
 *   1. Issue a fresh PAT via the DB (direct Prisma — bypasses NextAuth)
 *   2. Upload a ~3MB dummy PNG
 *   3. Assert 200 OK + { id, url } + Card row created
 */
import { randomBytes } from "crypto";
import { db } from "../src/lib/db";
import { issuePat, revokePat } from "../src/lib/external-pat";

const BASE = process.env.AURA_BASE ?? "http://localhost:3000";
const USER_ID = process.env.USER_ID ?? "u_owner";
const BOARD_ID = process.env.BOARD_ID ?? "";

async function main() {
  if (!BOARD_ID) {
    console.error("[smoke] set BOARD_ID=<cuid> before running");
    process.exit(2);
  }

  // Ensure PEPPER is set so verifyPat can validate.
  if (!process.env.AURA_PAT_PEPPER || process.env.AURA_PAT_PEPPER.length < 32) {
    console.error("[smoke] AURA_PAT_PEPPER (≥32 chars) required");
    process.exit(2);
  }

  const issued = await issuePat({
    userId: USER_ID,
    name: `smoke-${Date.now()}`,
    scopes: ["cards:write"],
    expiresInDays: 1,
  });
  console.log("[smoke] issued token id=%s prefix=%s", issued.id, issued.prefix);

  // Build a ~3MB dummy PNG payload (not a real PNG body; the data URL regex
  // only checks the prefix, so any base64 passes the *format* gate — we are
  // testing the request pipeline and DB/Blob wiring, not image validity).
  const sizeBytes = 3 * 1024 * 1024;
  const b64 = randomBytes(Math.floor((sizeBytes * 3) / 4)).toString("base64");
  const dataUrl = `data:image/png;base64,${b64}`;

  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/external/cards`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${issued.fullToken}`,
    },
    body: JSON.stringify({
      boardId: BOARD_ID,
      title: `smoke-${Date.now()}`,
      imageDataUrl: dataUrl,
    }),
  });
  const elapsed = Date.now() - t0;
  const json = await res.json();

  console.log("[smoke] status=%d elapsed=%dms body=%s", res.status, elapsed, JSON.stringify(json));

  let ok = false;
  if (res.status === 200 && json.id && json.url) {
    const card = await db.card.findUnique({ where: { id: json.id }, select: { id: true, imageUrl: true } });
    if (card && card.imageUrl) {
      console.log("[smoke] PASS card=%s imageUrl=%s", card.id, card.imageUrl);
      ok = true;
    } else {
      console.error("[smoke] FAIL — card missing or imageUrl null");
    }
  } else {
    console.error("[smoke] FAIL — unexpected response");
  }

  // Cleanup
  await revokePat(issued.id, USER_ID).catch(() => void 0);

  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("[smoke] error", e);
  process.exit(1);
});
