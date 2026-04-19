import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentStudent } from "@/lib/student-auth";
import { hasPermission } from "@/lib/bank-permissions";
import { ensureAccountFor } from "@/lib/bank";

const Body = z.object({
  studentId: z.string().min(1),
  principal: z.number().int().positive(),
});

const MATURITY_DAYS = 30;

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
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "studentId / principal 필수" },
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
    "bank.fd.open"
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Currency must have rate set
  const currency = await db.classroomCurrency.findUnique({
    where: { classroomId },
    select: { monthlyInterestRate: true },
  });
  if (!currency || currency.monthlyInterestRate === null) {
    return NextResponse.json(
      { error: "교사가 이자율을 설정하지 않아 적금 상품이 비활성화되어 있습니다" },
      { status: 400 }
    );
  }

  const target = await db.student.findUnique({
    where: { id: parsed.data.studentId },
    select: { id: true, classroomId: true },
  });
  if (!target || target.classroomId !== classroomId) {
    return NextResponse.json(
      { error: "학급 소속 학생이 아닙니다" },
      { status: 400 }
    );
  }

  const { accountId } = await ensureAccountFor(target);
  const performerId = user?.id ?? student?.id ?? "system";
  const performerKind = user ? "teacher" : "banker";
  const maturityDate = new Date(Date.now() + MATURITY_DAYS * 24 * 60 * 60 * 1000);

  try {
    const result = await db.$transaction(async (tx) => {
      const acc = await tx.studentAccount.findUnique({
        where: { id: accountId },
        select: { id: true, balance: true },
      });
      if (!acc) throw new Error("account_missing");
      if (acc.balance < parsed.data.principal) {
        throw new Error("insufficient_balance");
      }
      const updated = await tx.studentAccount.update({
        where: { id: acc.id },
        data: { balance: { decrement: parsed.data.principal } },
        select: { id: true, balance: true },
      });
      const fd = await tx.fixedDeposit.create({
        data: {
          accountId: updated.id,
          principal: parsed.data.principal,
          monthlyRate: currency.monthlyInterestRate as number,
          maturityDate,
          openedById: performerId,
          openedByKind: performerKind,
        },
      });
      await tx.transaction.create({
        data: {
          accountId: updated.id,
          type: "fd_open",
          amount: parsed.data.principal,
          balanceAfter: updated.balance,
          fixedDepositId: fd.id,
          performedById: performerId,
          performedByKind: performerKind,
        },
      });
      return { fd, balance: updated.balance };
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "error";
    if (msg === "insufficient_balance") {
      return NextResponse.json({ error: "잔액 부족" }, { status: 400 });
    }
    throw err;
  }
}
