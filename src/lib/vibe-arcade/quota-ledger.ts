// Vibe-arcade quota ledger (Seed 13, D-PHASE3-08, AC-F9).
// 3단 배분: 교사 월 쿼터 → 학급 일일 풀 → 학생 개인 상한.
// 본 모듈은 학급 풀 + 학생 상한만 다룬다 (교사 월 쿼터는 Anthropic 측 quota).

import { db } from "@/lib/db";

/** Returns current KST date (00:00 KST) for ledger rollup bucketing. */
export function kstDate(now: Date = new Date()): Date {
  const KST_OFFSET_MIN = 9 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  const kst = new Date(utc + KST_OFFSET_MIN * 60_000);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
}

export type QuotaCheckResult =
  | { ok: true; classroomUsed: number; studentUsed: number }
  | { ok: false; reason: "classroom_pool_exhausted" | "student_cap_exceeded" };

/**
 * Pre-session check. Reads today's ledger for the classroom + student rows.
 * If either would exceed its cap with estimated next-session usage, deny.
 *
 * Estimation: use 1 token as probe — actual enforcement happens via the
 * streaming provider, which increments `VibeQuotaLedger` and aborts on cap.
 */
export async function checkQuotaOrReject(args: {
  classroomId: string;
  studentId: string;
  classroomDailyTokenPool: number;
  perStudentDailyTokenCap: number | null;
}): Promise<QuotaCheckResult> {
  const date = kstDate();
  const [classroomRow, studentRow] = await Promise.all([
    db.vibeQuotaLedger.findUnique({
      where: {
        classroomId_studentId_date: {
          classroomId: args.classroomId,
          studentId: null as unknown as string, // Prisma unique key with null for classroom-wide row
          date,
        },
      },
    }),
    db.vibeQuotaLedger.findUnique({
      where: {
        classroomId_studentId_date: {
          classroomId: args.classroomId,
          studentId: args.studentId,
          date,
        },
      },
    }),
  ]);

  const classroomUsed = (classroomRow?.tokensIn ?? 0) + (classroomRow?.tokensOut ?? 0);
  const studentUsed = (studentRow?.tokensIn ?? 0) + (studentRow?.tokensOut ?? 0);

  if (classroomUsed >= args.classroomDailyTokenPool) {
    return { ok: false, reason: "classroom_pool_exhausted" };
  }
  if (args.perStudentDailyTokenCap !== null && studentUsed >= args.perStudentDailyTokenCap) {
    return { ok: false, reason: "student_cap_exceeded" };
  }
  return { ok: true, classroomUsed, studentUsed };
}

/**
 * Increment the ledger for a student + classroom-wide row atomically.
 * Called from the streaming provider on each token chunk boundary.
 */
export async function incrementLedger(args: {
  classroomId: string;
  studentId: string;
  tokensIn: number;
  tokensOut: number;
  newSession?: boolean;
}): Promise<void> {
  const date = kstDate();
  const sessions = args.newSession ? 1 : 0;

  await db.$transaction([
    db.vibeQuotaLedger.upsert({
      where: {
        classroomId_studentId_date: {
          classroomId: args.classroomId,
          studentId: args.studentId,
          date,
        },
      },
      create: {
        classroomId: args.classroomId,
        studentId: args.studentId,
        date,
        tokensIn: args.tokensIn,
        tokensOut: args.tokensOut,
        sessionsCount: sessions,
      },
      update: {
        tokensIn: { increment: args.tokensIn },
        tokensOut: { increment: args.tokensOut },
        sessionsCount: { increment: sessions },
      },
    }),
    db.vibeQuotaLedger.upsert({
      where: {
        classroomId_studentId_date: {
          classroomId: args.classroomId,
          studentId: null as unknown as string,
          date,
        },
      },
      create: {
        classroomId: args.classroomId,
        studentId: null,
        date,
        tokensIn: args.tokensIn,
        tokensOut: args.tokensOut,
        sessionsCount: sessions,
      },
      update: {
        tokensIn: { increment: args.tokensIn },
        tokensOut: { increment: args.tokensOut },
        sessionsCount: { increment: sessions },
      },
    }),
  ]);
}

/** Teacher dashboard summary for today. */
export async function getClassroomQuotaToday(classroomId: string) {
  const date = kstDate();
  const classroom = await db.vibeQuotaLedger.findUnique({
    where: {
      classroomId_studentId_date: {
        classroomId,
        studentId: null as unknown as string,
        date,
      },
    },
  });
  const byStudent = await db.vibeQuotaLedger.findMany({
    where: { classroomId, date, NOT: { studentId: null } },
    orderBy: [{ tokensIn: "desc" }, { tokensOut: "desc" }],
  });
  const used = (classroom?.tokensIn ?? 0) + (classroom?.tokensOut ?? 0);
  return { used, byStudent };
}
