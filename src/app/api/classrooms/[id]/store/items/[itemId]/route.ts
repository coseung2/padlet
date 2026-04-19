import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentStudent } from "@/lib/student-auth";
import { hasPermission } from "@/lib/bank-permissions";

const PatchBody = z.object({
  name: z.string().min(1).max(80).optional(),
  price: z.number().int().nonnegative().optional(),
  stock: z.number().int().nonnegative().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  archived: z.boolean().optional(),
});

async function guard(classroomId: string) {
  const [user, student] = await Promise.all([
    getCurrentUser().catch(() => null),
    getCurrentStudent().catch(() => null),
  ]);
  if (!user && !student) return { error: "Unauthorized", status: 401 as const };
  const ok = await hasPermission(
    classroomId,
    { userId: user?.id, studentId: student?.id },
    "store.item.manage"
  );
  if (!ok) return { error: "Forbidden", status: 403 as const };
  return { user, student };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id: classroomId, itemId } = await params;
  const g = await guard(classroomId);
  if ("error" in g) return NextResponse.json({ error: g.error }, { status: g.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값 확인" }, { status: 400 });
  }

  const item = await db.storeItem.findUnique({ where: { id: itemId } });
  if (!item || item.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const updated = await db.storeItem.update({
    where: { id: itemId },
    data: parsed.data,
  });
  return NextResponse.json({ item: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  // Soft delete — archived=true. Keeps historical Transaction.storeItemId refs valid.
  const { id: classroomId, itemId } = await params;
  const g = await guard(classroomId);
  if ("error" in g) return NextResponse.json({ error: g.error }, { status: g.status });

  const item = await db.storeItem.findUnique({ where: { id: itemId } });
  if (!item || item.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await db.storeItem.update({
    where: { id: itemId },
    data: { archived: true },
  });
  return NextResponse.json({ ok: true });
}
