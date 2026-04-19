import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentStudent } from "@/lib/student-auth";
import { hasPermission } from "@/lib/bank-permissions";

// Early withdrawal: principal-only return. No interest.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; fdId: string }> }
) {
  const { id: classroomId, fdId } = await params;

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
    "bank.fd.cancel"
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fd = await db.fixedDeposit.findUnique({
    where: { id: fdId },
    include: { account: { select: { id: true, classroomId: true } } },
  });
  if (!fd || fd.account.classroomId !== classroomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (fd.status !== "active") {
    return NextResponse.json(
      { error: "이미 처리된 적금입니다" },
      { status: 400 }
    );
  }

  const performerId = user?.id ?? student?.id ?? "system";
  const performerKind = user ? "teacher" : "banker";

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.studentAccount.update({
      where: { id: fd.account.id },
      data: { balance: { increment: fd.principal } },
      select: { id: true, balance: true },
    });
    await tx.fixedDeposit.update({
      where: { id: fd.id },
      data: { status: "early_withdrawn", maturedAt: new Date() },
    });
    const trx = await tx.transaction.create({
      data: {
        accountId: updated.id,
        type: "fd_cancelled",
        amount: fd.principal,
        balanceAfter: updated.balance,
        fixedDepositId: fd.id,
        note: "적금 중도해지 (원금만 반환)",
        performedById: performerId,
        performedByKind: performerKind,
      },
    });
    return { balance: updated.balance, transactionId: trx.id };
  });

  return NextResponse.json({ ok: true, ...result });
}
