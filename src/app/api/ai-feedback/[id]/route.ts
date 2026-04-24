// DELETE /api/ai-feedback/:id — 교사 본인 평어 삭제.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const row = await db.aiFeedback.findUnique({ where: { id }, select: { teacherId: true } });
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (row.teacherId !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await db.aiFeedback.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
