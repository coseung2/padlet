import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentStudent } from "@/lib/student-auth";
import { getEffectiveBoardRole } from "@/lib/rbac";

const MoveBody = z.object({
  order: z.number().int().min(0),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  const { id: boardIdOrSlug, cardId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = MoveBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "order 필수" }, { status: 400 });
  }

  const [user, student] = await Promise.all([
    getCurrentUser().catch(() => null),
    getCurrentStudent().catch(() => null),
  ]);
  if (!user && !student) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const board = await db.board.findFirst({
    where: { OR: [{ id: boardIdOrSlug }, { slug: boardIdOrSlug }] },
    select: { id: true },
  });
  if (!board) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const role = await getEffectiveBoardRole(board.id, {
    userId: user?.id,
    studentId: student?.id,
  });
  if (role !== "owner" && role !== "editor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const card = await db.card.findUnique({ where: { id: cardId } });
  if (!card || card.boardId !== board.id || card.queueStatus === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.card.update({
    where: { id: cardId },
    data: { order: parsed.data.order },
  });
  return NextResponse.json({ card: updated });
}
