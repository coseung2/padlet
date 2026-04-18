import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withParentScope } from "@/lib/parent-scope";
import { clearParentSession } from "@/lib/parent-session";

// PV-11 — parent-initiated soft-delete.
//
// POST /api/parent/account/withdraw
//
// Flow (all inside a transaction):
//   1) Set Parent.parentDeletedAt = now  (soft delete; triggers 90d
//      anonymization sweep).
//   2) Soft-delete all child links (ParentChildLink.deletedAt = now).
//   3) Revoke every active session.
//   4) Clear the caller's session cookie.
//
// The Parent row itself is NOT deleted — it remains so that the 90-day
// anonymize cron can replace PII with SHA-256 hashes. Hard delete would
// cascade-destroy audit trails that other classrooms may still reference
// (teacher's view of historical consent, etc).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withParentScope(req, async (ctx) => {
    const now = new Date();
    await db.$transaction([
      db.parent.update({
        where: { id: ctx.parent.id },
        data: { parentDeletedAt: now },
      }),
      db.parentChildLink.updateMany({
        where: { parentId: ctx.parent.id, deletedAt: null },
        data: { deletedAt: now },
      }),
      db.parentSession.updateMany({
        where: { parentId: ctx.parent.id, sessionRevokedAt: null },
        data: { sessionRevokedAt: now },
      }),
    ]);
    await clearParentSession();
    return NextResponse.json({ ok: true, withdrawnAt: now.toISOString() });
  });
}
