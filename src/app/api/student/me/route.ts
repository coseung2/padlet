import { NextResponse } from "next/server";
import { getCurrentStudent } from "@/lib/student-auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const student = await getCurrentStudent();
    if (!student) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const boards = await db.board.findMany({
      where: { classroomId: student.classroomId },
      select: {
        id: true,
        slug: true,
        title: true,
        layout: true,
        _count: { select: { cards: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        classroom: student.classroom,
      },
      boards,
    });
  } catch (e) {
    console.error("[GET /api/student/me]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
