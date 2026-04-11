import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateQrToken, generateTextCode } from "@/lib/classroom-utils";

const AddStudentsSchema = z.object({
  names: z.array(z.string().min(1).max(50)).min(1).max(50),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const classroom = await db.classroom.findUnique({ where: { id } });
    if (!classroom || classroom.teacherId !== user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const input = AddStudentsSchema.parse(body);

    const studentsData = [];
    for (const name of input.names) {
      const qrToken = generateQrToken();
      const textCode = await generateTextCode();
      studentsData.push({ classroomId: id, name: name.trim(), qrToken, textCode });
    }

    const students = await db.$transaction(
      studentsData.map((data) => db.student.create({ data }))
    );

    return NextResponse.json({ students }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[POST /api/classroom/:id/students]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
