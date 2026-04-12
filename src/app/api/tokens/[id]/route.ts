/**
 * DELETE /api/tokens/[id] — soft-revoke (revokedAt = now). Scoped to caller.
 */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { revokePat } from "@/lib/external-pat";
import { externalErrorResponse } from "@/lib/external-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await ctx.params;
    if (!id) return externalErrorResponse("invalid_data_url", "missing id");
    const ok = await revokePat(id, user.id);
    if (!ok) return externalErrorResponse("not_found", "Token not found or already revoked");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/tokens/[id]]", e);
    return externalErrorResponse("internal");
  }
}
