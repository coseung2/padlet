import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// DELETE /api/classrooms/:id/roles/assign/:assignmentId
// Revokes a classroom role assignment. Teacher-only. Idempotent.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const { id: classroomId, assignmentId } = await params;

  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const classroom = await db.classroom.findUnique({
    where: { id: classroomId },
    select: { teacherId: true },
  });
  if (!classroom) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (classroom.teacherId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assignment = await db.classroomRoleAssignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, classroomId: true },
  });
  // Idempotent: missing or already deleted → ok.
  if (!assignment || assignment.classroomId !== classroomId) {
    return NextResponse.json({ ok: true });
  }

  await db.classroomRoleAssignment.delete({ where: { id: assignmentId } });
  return NextResponse.json({ ok: true });
}
