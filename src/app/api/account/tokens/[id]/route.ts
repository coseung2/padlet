/**
 * DELETE /api/account/tokens/[id] — revoke (soft-delete) a PAT.
 * Scoped to the authenticated user so an id guess from another account fails.
 */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { revokeToken } from "@/lib/external-auth";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const ok = await revokeToken(id, user.id);
    if (!ok) return NextResponse.json({ error: "not_found_or_already_revoked" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/account/tokens/[id]]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
