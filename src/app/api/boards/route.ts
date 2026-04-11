import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const CreateBoardSchema = z.object({
  title: z.string().max(200).default(""),
  layout: z.enum(["freeform", "grid", "stream", "columns", "assignment", "quiz"]),
  description: z.string().max(2000).default(""),
  classroomId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const input = CreateBoardSchema.parse(body);

    const baseSlug = input.title
      ? input.title.toLowerCase().replace(/[^a-z0-9가-힣]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
      : "board";
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // If columns layout with classroom, fetch students for auto-sections
    let students: { number: number | null; name: string }[] = [];
    if (input.layout === "columns" && input.classroomId) {
      const classroom = await db.classroom.findUnique({
        where: { id: input.classroomId },
        include: {
          students: { orderBy: [{ number: "asc" }, { createdAt: "asc" }] },
        },
      });
      if (classroom && classroom.teacherId === user.id) {
        students = classroom.students.map((s) => ({
          number: s.number,
          name: s.name,
        }));
      }
    }

    const board = await db.board.create({
      data: {
        title: input.title,
        slug,
        layout: input.layout,
        description: input.description,
        classroomId: input.classroomId ?? null,
        members: {
          create: { userId: user.id, role: "owner" },
        },
        sections:
          students.length > 0
            ? {
                create: students.map((s, i) => ({
                  title: s.number ? `${s.number}번 ${s.name}` : s.name,
                  order: i,
                })),
              }
            : undefined,
      },
    });

    return NextResponse.json({ board });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[POST /api/boards]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
