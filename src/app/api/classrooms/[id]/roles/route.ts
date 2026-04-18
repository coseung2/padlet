import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/classrooms/:id/roles
// Returns role definitions + current assignments for the classroom.
// Teacher-only (classroom.teacherId === user.id).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classroomId } = await params;

  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const classroom = await db.classroom.findUnique({
    where: { id: classroomId },
    select: { id: true, teacherId: true },
  });
  if (!classroom) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (classroom.teacherId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [defs, assignments] = await Promise.all([
    db.classroomRoleDef.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        key: true,
        labelKo: true,
        emoji: true,
        description: true,
      },
    }),
    db.classroomRoleAssignment.findMany({
      where: { classroomId },
      orderBy: { assignedAt: "desc" },
      select: {
        id: true,
        studentId: true,
        classroomRoleId: true,
        assignedAt: true,
        student: { select: { id: true, name: true, number: true } },
      },
    }),
  ]);

  return NextResponse.json({ defs, assignments });
}
