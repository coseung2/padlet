import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission, ForbiddenError } from "@/lib/rbac";

const CreateCardSchema = z.object({
  boardId: z.string().min(1),
  title: z.string().min(1).max(200),
  content: z.string().max(5000).default(""),
  color: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  linkUrl: z.string().url().nullable().optional(),
  linkTitle: z.string().nullable().optional(),
  linkDesc: z.string().nullable().optional(),
  linkImage: z.string().nullable().optional(),
  videoUrl: z.string().url().nullable().optional(),
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().optional(),
  height: z.number().optional(),
  order: z.number().optional(),
  sectionId: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const input = CreateCardSchema.parse(body);
    await requirePermission(input.boardId, user.id, "edit");

    const card = await db.card.create({
      data: {
        boardId: input.boardId,
        authorId: user.id,
        title: input.title,
        content: input.content,
        color: input.color ?? null,
        imageUrl: input.imageUrl ?? null,
        linkUrl: input.linkUrl ?? null,
        linkTitle: input.linkTitle ?? null,
        linkDesc: input.linkDesc ?? null,
        linkImage: input.linkImage ?? null,
        videoUrl: input.videoUrl ?? null,
        x: input.x,
        y: input.y,
        width: input.width ?? 240,
        height: input.height ?? 160,
        order: input.order ?? 0,
        sectionId: input.sectionId ?? null,
      },
    });

    return NextResponse.json({ card });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[POST /api/cards]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
