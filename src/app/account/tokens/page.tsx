/**
 * /account/tokens — backward-compat alias. Seed 8 moves canonical teacher PAT
 * self-service to /(teacher)/settings/external-tokens. This file redirects.
 */
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LegacyTokensAlias() {
  redirect("/settings/external-tokens");
}
