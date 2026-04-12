/**
 * POST /api/oauth/revoke — RFC 7009 Token Revocation.
 *
 * Canva calls this when a user disconnects the app. Per spec the endpoint
 * always responds 200 (to prevent token-existence probing) regardless of
 * whether the token was recognized. Client authentication is still required.
 */
import { NextResponse } from "next/server";
import { authenticateClient, revokeToken } from "@/lib/oauth-server";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function POST(req: Request) {
  const form = await req.formData();
  const token = String(form.get("token") ?? "");

  const clientAuth = await authenticateClient({
    basicAuthHeader: req.headers.get("authorization"),
    bodyClientId: (form.get("client_id") as string) ?? null,
    bodyClientSecret: (form.get("client_secret") as string) ?? null,
  });
  if (!clientAuth.ok) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }

  if (token) await revokeToken(token);

  return new NextResponse(null, { status: 200 });
}
