import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id, studentId } = await params;

    const classroom = await db.classroom.findUnique({ where: { id } });
    if (!classroom || classroom.teacherId !== user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const student = await db.student.findUnique({ where: { id: studentId } });
    if (!student || student.classroomId !== id) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    await db.student.delete({ where: { id: studentId } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("[DELETE /api/classroom/:id/students/:studentId]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
