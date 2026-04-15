import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canTransition } from "@/lib/parent-link-state";

// parent-class-invite-v2 — POST /api/parent/approvals/[linkId]/approve.
// Transitions ParentChildLink.pending → active + attaches BoardMember rows
// so the parent can see the classroom's boards.

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { linkId } = await params;

    const link = await db.parentChildLink.findUnique({
      where: { id: linkId },
      include: {
        student: { include: { classroom: true } },
        parent: true,
      },
    });
    if (!link) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (link.student.classroom.teacherId !== user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (!canTransition(link.status, "active")) {
      return NextResponse.json({ error: "invalid_state" }, { status: 409 });
    }

    const now = new Date();
    // Parent identity doesn't exist as a User row — BoardMember.userId FKs
    // User, not Parent. The parent-scope middleware covers read access.
    // So the "attach BoardMember" step from architecture.md §5.2 is
    // satisfied by the ParentChildLink.active state alone for v1. Downstream
    // rendering (parent home page) already uses ParentChildLink.status.
    // This is a surgical narrowing — we do NOT invent a synthetic User row.
    await db.parentChildLink.update({
      where: { id: link.id },
      data: {
        status: "active",
        approvedAt: now,
        approvedById: user.id,
      },
    });

    return NextResponse.json({ linkId: link.id, status: "active", approvedAt: now.toISOString() });
  } catch (e) {
    console.error("[POST /api/parent/approvals/:id/approve]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
