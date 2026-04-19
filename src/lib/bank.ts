import "server-only";
import { db } from "./db";
import { generateCardNumber, generateCardSecret } from "./qr-token";

/**
 * Lazy-create a StudentAccount + StudentCard for a student on first access.
 * Idempotent — returns the existing rows if already provisioned.
 */
export async function ensureAccountFor(student: {
  id: string;
  classroomId: string;
}): Promise<{ accountId: string; cardId: string }> {
  const existing = await db.studentAccount.findUnique({
    where: { studentId: student.id },
    include: { cards: { take: 1 } },
  });
  if (existing && existing.cards[0]) {
    return { accountId: existing.id, cardId: existing.cards[0].id };
  }
  // New or missing card — create in a single transaction
  return db.$transaction(async (tx) => {
    const account =
      existing ??
      (await tx.studentAccount.create({
        data: {
          studentId: student.id,
          classroomId: student.classroomId,
          balance: 0,
        },
      }));
    let cardNumber = generateCardNumber();
    // cardNumber is @@unique — retry on collision (very rare)
    for (let i = 0; i < 5; i++) {
      const existingCard = await tx.studentCard.findUnique({
        where: { cardNumber },
      });
      if (!existingCard) break;
      cardNumber = generateCardNumber();
    }
    const card = await tx.studentCard.create({
      data: {
        accountId: account.id,
        cardNumber,
        qrSecret: generateCardSecret(),
      },
    });
    return { accountId: account.id, cardId: card.id };
  });
}

/**
 * Lazy-ensure the classroom has a ClassroomCurrency row (teacher-controlled
 * settings). unitLabel defaults to "원" and rate starts null (적금 비활성)
 * until the teacher sets it.
 */
export async function ensureClassroomCurrency(classroomId: string) {
  return db.classroomCurrency.upsert({
    where: { classroomId },
    create: { classroomId },
    update: {},
  });
}
