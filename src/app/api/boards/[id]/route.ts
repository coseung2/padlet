import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission, ForbiddenError } from "@/lib/rbac";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const board = await db.board.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        cards: { orderBy: { createdAt: "asc" } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const role = await requirePermission(board.id, user.id, "view");

    return NextResponse.json({
      board: { id: board.id, slug: board.slug, title: board.title },
      cards: board.cards,
      members: board.members,
      currentUser: { id: user.id, name: user.name, role },
    });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("[GET /api/boards/:id]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
