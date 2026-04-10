import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission, getBoardRole, ForbiddenError } from "@/lib/rbac";

const PatchCardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(5000).optional(),
  color: z.string().nullable().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  order: z.number().int().optional(),
  sectionId: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const card = await db.card.findUnique({ where: { id } });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    await requirePermission(card.boardId, user.id, "edit");

    const body = await req.json();
    const input = PatchCardSchema.parse(body);
    const updated = await db.card.update({ where: { id }, data: input });

    return NextResponse.json({ card: updated });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[PATCH /api/cards/:id]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const card = await db.card.findUnique({ where: { id } });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const role = await getBoardRole(card.boardId, user.id);
    if (!role) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    // owner deletes anything; editor deletes own cards only
    const isAuthor = card.authorId === user.id;
    const canDelete = role === "owner" || (role === "editor" && isAuthor);
    if (!canDelete) {
      return NextResponse.json(
        { error: `Role "${role}" cannot delete this card` },
        { status: 403 }
      );
    }

    await db.card.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("[DELETE /api/cards/:id]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
