import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// PV-8 — list all active ParentChildLink rows in a classroom for the
// teacher management tab.
//
// Access: classroom.teacherId === user.id. 404 otherwise (non-disclosure).
// Returns: per-link student name/number, parent name/email/tier, last-seen
// (derived from parent's most recent lastSeenAt across sessions).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: classroomId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const classroom = await db.classroom.findUnique({
    where: { id: classroomId },
    select: { id: true, teacherId: true },
  });
  if (!classroom || classroom.teacherId !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const links = await db.parentChildLink.findMany({
    where: { deletedAt: null, student: { classroomId } },
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { id: true, name: true, number: true } },
      parent: {
        select: {
          id: true,
          name: true,
          email: true,
          tier: true,
          parentDeletedAt: true,
          sessions: {
            select: { lastSeenAt: true, sessionRevokedAt: true, expiresAt: true },
          },
        },
      },
    },
  });

  const shaped = links.map((l) => {
    const lastSeen = l.parent.sessions
      .map((s) => s.lastSeenAt)
      .filter((d): d is Date => !!d)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    return {
      id: l.id,
      createdAt: l.createdAt,
      student: l.student,
      parent: {
        id: l.parent.id,
        name: l.parent.name,
        email: l.parent.email,
        tier: l.parent.tier,
      },
      lastSeenAt: lastSeen,
    };
  });

  return NextResponse.json({ links: shaped });
}
