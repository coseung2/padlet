import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateClassroomCode } from "@/lib/classroom-utils";

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    const classrooms = await db.classroom.findMany({
      where: { teacherId: user.id },
      include: {
        _count: { select: { students: true, boards: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ classrooms });
  } catch (e) {
    console.error("[GET /api/classroom]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const input = CreateSchema.parse(body);
    const code = await generateClassroomCode();

    const classroom = await db.classroom.create({
      data: {
        name: input.name,
        code,
        teacherId: user.id,
      },
      include: { _count: { select: { students: true, boards: true } } },
    });

    return NextResponse.json({ classroom }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[POST /api/classroom]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
