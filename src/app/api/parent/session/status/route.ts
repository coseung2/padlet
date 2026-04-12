import { NextResponse } from "next/server";
import { withParentScope } from "@/lib/parent-scope";

// PV-9 — cheap session-heartbeat endpoint.
//
// Parent client polls this every 45s. When the teacher revokes the link
// (PV-8 → session revoke), getCurrentParent() returns null and
// requireParentScope throws 401 → client redirects to /parent/logged-out.
//
// We intentionally only return the parent id + tier (non-sensitive) so the
// response is tiny and can be polled aggressively without LTE cost.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  return withParentScope(req, async (ctx) => {
    return NextResponse.json({
      ok: true,
      parentId: ctx.parent.id,
      tier: ctx.parent.tier,
      childCount: ctx.childIds.size,
    });
  });
}
