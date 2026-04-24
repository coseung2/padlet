#!/usr/bin/env node
/**
 * One-shot seed: register the Aura companion app as an OAuthClient.
 *
 *   CLIENT_ID = aura-companion
 *   redirect_uris (확정):
 *     https://aura-teacher.com/integrations/aura-board/callback
 *     http://localhost:4000/integrations/aura-board/callback
 *   scopes      = ["external:read"]
 *   pkceRequired = true (S256)
 *
 * Run once locally → prints the plaintext CLIENT_SECRET. Save it to a safe
 * channel (1Password / direct hand-off) and give to the Aura team. We only
 * persist sha256(secret + AURA_PAT_PEPPER) — the plaintext can never be
 * recovered from the DB.
 *
 * Re-running rotates the secret (overwrites secretHash). Old secret stops
 * working immediately on next /api/oauth/token call.
 *
 * Usage:
 *   node scripts/seed-aura-companion-client.mjs           # generate new secret
 *   node scripts/seed-aura-companion-client.mjs --rotate  # explicit rotation
 */
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "crypto";

const CLIENT_ID = "aura-companion";
const REDIRECT_URIS = [
  "https://aura-teacher.com/integrations/aura-board/callback",
  "http://localhost:4000/integrations/aura-board/callback",
];
const SCOPES = ["external:read"];

// Seed 가 prod DB 에 dev fallback pepper 로 hash 박는 사고 방지: 명시적
// AURA_PAT_PEPPER 가 없으면 무조건 abort. 로컬 dev DB 면 ALLOW_DEV_PEPPER=1
// 로 우회 가능. (회귀 방지 가드 — 2026-04-24 sec)
function pepper() {
  const p = process.env.AURA_PAT_PEPPER;
  if (p && p.length >= 32) return p;
  if (process.env.ALLOW_DEV_PEPPER === "1") {
    return "aura-dev-pepper-fallback-ge-32-chars-for-local-use-only";
  }
  console.error(
    "❌ AURA_PAT_PEPPER 미설정. Vercel prod 환경변수와 일치하지 않으면 hash mismatch 로\n" +
      "   /api/oauth/token 이 invalid_client 를 돌려줍니다.\n\n" +
      "   해결: Vercel 에서 pull 후 실행:\n" +
      "     vercel env pull /tmp/.env.prod --environment=production --yes\n" +
      "     PROD_PEPPER=$(grep '^AURA_PAT_PEPPER=' /tmp/.env.prod | sed 's/^AURA_PAT_PEPPER=\"//;s/\"$//')\n" +
      "     AURA_PAT_PEPPER=\"$PROD_PEPPER\" node scripts/seed-aura-companion-client.mjs\n\n" +
      "   로컬 dev DB 라면: ALLOW_DEV_PEPPER=1 node scripts/seed-aura-companion-client.mjs"
  );
  process.exit(1);
}

function hashSecret(secret) {
  return createHash("sha256").update(`${secret}:${pepper()}`).digest("hex");
}

function generateSecret() {
  // 256-bit entropy → 43 base64url chars. Easy to copy-paste.
  return randomBytes(32).toString("base64url");
}

async function main() {
  const prisma = new PrismaClient();
  const plaintext = generateSecret();
  const hash = hashSecret(plaintext);

  const existing = await prisma.oAuthClient.findUnique({ where: { id: CLIENT_ID } });
  if (existing) {
    await prisma.oAuthClient.update({
      where: { id: CLIENT_ID },
      data: {
        secretHash: hash,
        redirectUris: JSON.stringify(REDIRECT_URIS),
        scopes: JSON.stringify(SCOPES),
        pkceRequired: true,
        updatedAt: new Date(),
      },
    });
    console.log("─".repeat(60));
    console.log("OAuthClient ROTATED:", CLIENT_ID);
  } else {
    await prisma.oAuthClient.create({
      data: {
        id: CLIENT_ID,
        name: "Aura Companion (Teacher web app)",
        secretHash: hash,
        redirectUris: JSON.stringify(REDIRECT_URIS),
        scopes: JSON.stringify(SCOPES),
        pkceRequired: true,
      },
    });
    console.log("─".repeat(60));
    console.log("OAuthClient CREATED:", CLIENT_ID);
  }
  console.log("─".repeat(60));
  console.log("CLIENT_ID:    ", CLIENT_ID);
  console.log("CLIENT_SECRET:", plaintext);
  console.log("─".repeat(60));
  console.log("redirect_uris:", REDIRECT_URIS.join(", "));
  console.log("scopes:       ", SCOPES.join(" "));
  console.log("─".repeat(60));
  console.log("⚠️  Save CLIENT_SECRET now — only shown once. DB stores hash only.");
  console.log("⚠️  Hand off via 1Password / encrypted channel to Aura team.");
  console.log("⚠️  Old secret (if rotation) is INVALID immediately.");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
