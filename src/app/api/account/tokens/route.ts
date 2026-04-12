/**
 * GET  /api/account/tokens    — list current user's external PATs (hashes only)
 * POST /api/account/tokens    — issue a new PAT; plaintext returned ONCE.
 *
 * Auth: NextAuth session (or mock "as" cookie in dev). Students cannot
 * reach this route because getCurrentUser() is NextAuth/mock-user-scoped.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { issueToken, listTokens } from "@/lib/external-auth";

export const runtime = "nodejs";

const IssueSchema = z.object({ name: z.string().min(1).max(100) });

export async function GET() {
  const user = await getCurrentUser();
  const rows = await listTokens(user.id);
  return NextResponse.json({ tokens: rows });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = IssueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed", issues: parsed.error.issues }, { status: 400 });
  }
  try {
    const { id, token, createdAt } = await issueToken(user.id, parsed.data.name);
    return NextResponse.json({ id, token, createdAt });
  } catch (e) {
    const code = (e as Error & { code?: string }).code;
    if (code === "token_limit_exceeded") {
      return NextResponse.json({ error: "token_limit_exceeded" }, { status: 400 });
    }
    if ((e as Error).message === "invalid_name") {
      return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    }
    console.error("[POST /api/account/tokens]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
