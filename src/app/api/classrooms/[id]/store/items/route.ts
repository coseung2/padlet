import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentStudent } from "@/lib/student-auth";
import { hasPermission } from "@/lib/bank-permissions";

const CreateBody = z.object({
  name: z.string().min(1).max(80),
  price: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
});

// GET: anyone authenticated in classroom (teacher OR classroom student).
// ?archived=1 → return archived items instead; gated by store.item.manage.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classroomId } = await params;
  const wantArchived =
    new URL(req.url).searchParams.get("archived") === "1";

  const [user, student] = await Promise.all([
    getCurrentUser().catch(() => null),
    getCurrentStudent().catch(() => null),
  ]);
  if (!user && !student) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const classroom = await db.classroom.findUnique({
    where: { id: classroomId },
    select: { teacherId: true },
  });
  if (!classroom) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const isTeacher = user?.id === classroom.teacherId;
  const isClassroomStudent =
    student && student.classroomId === classroomId ? true : false;
  if (!isTeacher && !isClassroomStudent) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (wantArchived) {
    const allowed = await hasPermission(
      classroomId,
      { userId: user?.id, studentId: student?.id },
      "store.item.manage"
    );
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const items = await db.storeItem.findMany({
    where: { classroomId, archived: wantArchived },
    orderBy: [{ createdAt: "desc" }],
  });

  return NextResponse.json({ items });
}

// POST: create item — requires store.item.manage
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classroomId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력값 확인 필요" },
      { status: 400 }
    );
  }

  const [user, student] = await Promise.all([
    getCurrentUser().catch(() => null),
    getCurrentStudent().catch(() => null),
  ]);
  if (!user && !student) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await hasPermission(
    classroomId,
    { userId: user?.id, studentId: student?.id },
    "store.item.manage"
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const item = await db.storeItem.create({
    data: {
      classroomId,
      name: parsed.data.name,
      price: parsed.data.price,
      stock: parsed.data.stock ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
    },
  });
  return NextResponse.json({ item });
}
