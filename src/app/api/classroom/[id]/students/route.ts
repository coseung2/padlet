import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateQrToken, generateTextCode } from "@/lib/classroom-utils";

const StudentEntry = z.object({
  number: z.number().int().min(1),
  name: z.string().min(1).max(50),
});

const AddStudentsSchema = z.object({
  students: z.array(StudentEntry).min(1).max(50),
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

    // Check for duplicate numbers within the request
    const numbers = input.students.map((s) => s.number);
    if (new Set(numbers).size !== numbers.length) {
      return NextResponse.json({ error: "중복된 번호가 있습니다" }, { status: 400 });
    }

    // Check for duplicate numbers in existing students
    const existing = await db.student.findMany({
      where: { classroomId: id, number: { in: numbers } },
      select: { number: true },
    });
    if (existing.length > 0) {
      const dupes = existing.map((s) => s.number).join(", ");
      return NextResponse.json(
        { error: `이미 존재하는 번호: ${dupes}` },
        { status: 409 }
      );
    }

    const studentsData = [];
    for (const entry of input.students) {
      const qrToken = generateQrToken();
      const textCode = await generateTextCode();
      studentsData.push({
        classroomId: id,
        number: entry.number,
        name: entry.name.trim(),
        qrToken,
        textCode,
      });
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
