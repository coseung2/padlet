import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission, ForbiddenError } from "@/lib/rbac";

const MoveCardSchema = z.object({
  sectionId: z.string().nullable(),
  order: z.number().int().min(0),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const card = await db.card.findUnique({ where: { id } });
    if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

    await requirePermission(card.boardId, user.id, "edit");

    const body = await req.json();
    const input = MoveCardSchema.parse(body);

    const updated = await db.card.update({
      where: { id },
      data: { sectionId: input.sectionId, order: input.order },
    });

    return NextResponse.json({ card: updated });
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[PATCH /api/cards/:id/move]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
