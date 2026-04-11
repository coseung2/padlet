import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const UpdateSchema = z.object({
  name: z.string().min(1).max(100),
});

async function requireOwnership(classroomId: string, userId: string) {
  const classroom = await db.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom) return null;
  if (classroom.teacherId !== userId) return null;
  return classroom;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const classroom = await db.classroom.findUnique({
      where: { id },
      include: {
        students: { orderBy: { createdAt: "asc" } },
        boards: { select: { id: true, slug: true, title: true, layout: true } },
      },
    });
    if (!classroom || classroom.teacherId !== user.id) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ classroom });
  } catch (e) {
    console.error("[GET /api/classroom/:id]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    if (!(await requireOwnership(id, user.id))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const input = UpdateSchema.parse(body);
    const updated = await db.classroom.update({
      where: { id },
      data: { name: input.name },
    });
    return NextResponse.json({ classroom: updated });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[PATCH /api/classroom/:id]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    if (!(await requireOwnership(id, user.id))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    await db.classroom.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("[DELETE /api/classroom/:id]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
