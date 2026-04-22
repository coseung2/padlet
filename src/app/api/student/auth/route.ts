import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createStudentSession } from "@/lib/student-auth";

const AuthSchema = z.object({
  token: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token } = AuthSchema.parse(body);

    // Try qrToken first, then textCode
    let student = await db.student.findUnique({ where: { qrToken: token } });
    if (!student) {
      student = await db.student.findUnique({ where: { textCode: token.toUpperCase() } });
    }

    if (!student) {
      return NextResponse.json({ error: "invalid_token" }, { status: 404 });
    }

    // Cookie는 웹 세션용, sessionToken은 모바일 앱이 SecureStore에 보관해
    // 이후 요청에 `Authorization: Bearer <token>` 으로 재사용.
    const sessionToken = await createStudentSession(student.id, student.classroomId);

    return NextResponse.json({
      success: true,
      redirect: "/student",
      sessionToken,
      student: {
        id: student.id,
        name: student.name,
        classroomId: student.classroomId,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[POST /api/student/auth]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
