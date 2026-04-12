/**
 * One-shot seed for the canva OAuth client row.
 *
 * Reads CANVA_OAUTH_CLIENT_SECRET + CANVA_OAUTH_REDIRECT_URIS + AURA_PAT_PEPPER
 * from the environment (loaded from .env.production via dotenv). Writes the
 * matching OAuthClient row, hashing the secret exactly the way
 * src/lib/oauth-server.ts#authenticateClient will later verify it.
 */
import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { config } from "dotenv";
import path from "path";

// Prefer .env.production if it exists; fall back to default .env.
config({ path: path.resolve(process.cwd(), ".env.production") });
config({ path: path.resolve(process.cwd(), ".env"), override: false });

const prisma = new PrismaClient();

function hashSecret(secret: string): string {
  const pepper = process.env.AURA_PAT_PEPPER;
  if (!pepper || pepper.length < 32) {
    throw new Error("AURA_PAT_PEPPER missing — cannot seed canva client");
  }
  return createHash("sha256").update(`${secret}:${pepper}`).digest("hex");
}

async function main() {
  const secret = process.env.CANVA_OAUTH_CLIENT_SECRET;
  const redirectUris = process.env.CANVA_OAUTH_REDIRECT_URIS;
  if (!secret) throw new Error("CANVA_OAUTH_CLIENT_SECRET not set");
  if (!redirectUris) throw new Error("CANVA_OAUTH_REDIRECT_URIS not set");

  const parsed = redirectUris.split(",").map((s) => s.trim()).filter(Boolean);
  if (parsed.length === 0) throw new Error("CANVA_OAUTH_REDIRECT_URIS empty after parse");

  const row = await prisma.oAuthClient.upsert({
    where: { id: "canva" },
    create: {
      id: "canva",
      name: "Canva Content Publisher",
      secretHash: hashSecret(secret),
      redirectUris: JSON.stringify(parsed),
      scopes: JSON.stringify(["cards:write"]),
      pkceRequired: true,
    },
    update: {
      name: "Canva Content Publisher",
      secretHash: hashSecret(secret),
      redirectUris: JSON.stringify(parsed),
      scopes: JSON.stringify(["cards:write"]),
      pkceRequired: true,
    },
  });

  console.log("✅ OAuthClient upserted:", {
    id: row.id,
    redirectUris: JSON.parse(row.redirectUris),
    scopes: JSON.parse(row.scopes),
    pkceRequired: row.pkceRequired,
  });
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
