import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const CreateBoardSchema = z.object({
  title: z.string().max(200).default(""),
  layout: z.enum(["freeform", "grid", "stream", "columns", "assignment", "quiz"]),
  description: z.string().max(2000).default(""),
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

    const board = await db.board.create({
      data: {
        title: input.title,
        slug,
        layout: input.layout,
        description: input.description,
        members: {
          create: { userId: user.id, role: "owner" },
        },
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
