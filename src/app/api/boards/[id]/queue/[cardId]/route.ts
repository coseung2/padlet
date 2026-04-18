import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentStudent } from "@/lib/student-auth";
import { getEffectiveBoardRole } from "@/lib/rbac";

const PatchBody = z.object({
  status: z.enum(["approved", "rejected", "played"]),
});

async function resolveBoard(idOrSlug: string) {
  return db.board.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true, layout: true },
  });
}

async function resolveIdentity() {
  const [user, student] = await Promise.all([
    getCurrentUser().catch(() => null),
    getCurrentStudent().catch(() => null),
  ]);
  return { user, student };
}

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
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "status 필수" }, { status: 400 });
  }

  const { user, student } = await resolveIdentity();
  if (!user && !student) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const board = await resolveBoard(boardIdOrSlug);
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
  if (!card || card.boardId !== board.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (card.queueStatus === null) {
    return NextResponse.json(
      { error: "큐 항목이 아닙니다" },
      { status: 400 }
    );
  }

  const updated = await db.card.update({
    where: { id: cardId },
    data: { queueStatus: parsed.data.status },
  });

  return NextResponse.json({ card: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  const { id: boardIdOrSlug, cardId } = await params;

  const { user, student } = await resolveIdentity();
  if (!user && !student) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const board = await resolveBoard(boardIdOrSlug);
  if (!board) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const card = await db.card.findUnique({ where: { id: cardId } });
  if (!card || card.boardId !== board.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const role = await getEffectiveBoardRole(board.id, {
    userId: user?.id,
    studentId: student?.id,
  });

  const isDJOrTeacher = role === "owner" || role === "editor";
  const isOwnPending =
    card.queueStatus === "pending" &&
    student !== null &&
    card.studentAuthorId === student.id;

  if (!isDJOrTeacher && !isOwnPending) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.card.delete({ where: { id: cardId } });
  return NextResponse.json({ ok: true });
}
