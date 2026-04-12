import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// DELETE /api/parent-invites/[id]
// Teacher-only: soft-revokes the invite code. Returns 404 if the current
// teacher does not own the classroom for the invite's student (existence
// non-disclosure).

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const invite = await db.parentInviteCode.findUnique({
      where: { id },
      include: { student: { include: { classroom: { select: { teacherId: true } } } } },
    });
    if (!invite) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (invite.student.classroom.teacherId !== user.id) {
      // 404 to avoid enumerate-invite-ids leak
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (invite.revokedAt) {
      return NextResponse.json({ ok: true, alreadyRevoked: true });
    }

    await db.parentInviteCode.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/parent-invites/[id]]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
