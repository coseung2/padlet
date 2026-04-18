import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// parent-class-invite-v2 — GET /api/parent/approvals?classroomId=&status=pending|active
// Used by the teacher parent-access page for the inbox + linked list.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    const url = new URL(req.url);
    const classroomId = url.searchParams.get("classroomId");
    const status = url.searchParams.get("status");
    if (!classroomId || (status !== "pending" && status !== "active")) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
    const classroom = await db.classroom.findUnique({ where: { id: classroomId } });
    if (!classroom || classroom.teacherId !== user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const links = await db.parentChildLink.findMany({
      where: {
        status,
        deletedAt: null,
        student: { classroomId },
      },
      orderBy: { requestedAt: "asc" },
      include: {
        parent: { select: { email: true } },
        student: { select: { id: true, name: true, number: true } },
      },
    });

    return NextResponse.json({
      items: links.map((l) => ({
        linkId: l.id,
        parentEmail: l.parent.email,
        studentId: l.student.id,
        studentName: l.student.name,
        classNo: 0,
        studentNo: l.student.number ?? 0,
        requestedAt: l.requestedAt.toISOString(),
        approvedAt: l.approvedAt?.toISOString() ?? null,
      })),
    });
  } catch (e) {
    console.error("[GET /api/parent/approvals]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
