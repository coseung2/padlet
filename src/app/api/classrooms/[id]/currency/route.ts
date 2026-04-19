import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensureClassroomCurrency } from "@/lib/bank";

const Body = z.object({
  unitLabel: z.string().min(1).max(20).optional(),
  monthlyInterestRate: z.number().min(0).max(50).nullable().optional(),
});

// PATCH /api/classrooms/:id/currency
// Teacher sets unit label + monthly interest rate. null rate disables FD.
export async function PATCH(
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
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력 확인 (이자율 0~50)" },
      { status: 400 }
    );
  }

  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const classroom = await db.classroom.findUnique({
    where: { id: classroomId },
    select: { teacherId: true },
  });
  if (!classroom) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (classroom.teacherId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ensureClassroomCurrency(classroomId);
  const updated = await db.classroomCurrency.update({
    where: { classroomId },
    data: parsed.data,
  });
  return NextResponse.json({ currency: updated });
}
