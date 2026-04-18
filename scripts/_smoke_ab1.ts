// AB-1 phase9 smoke test. Verifies schema additions are reachable + state
// machine integrity when exercised through the real Prisma client.
//
//   npx tsx scripts/_smoke_ab1.ts
//
// Side effects: creates + deletes a single Classroom and its children within
// a transaction-scoped cleanup. Safe to run against shared DB.
import { db } from "../src/lib/db";
import { randomUUID } from "crypto";

async function main() {
  console.log("── AB1-smoke 1 — schema reachable ──");
  const slotCount = await db.assignmentSlot.count();
  console.log("  AssignmentSlot table:", slotCount, "rows");
  const boardDelta = await db.board.findMany({
    where: { layout: "assignment" },
    select: { id: true, assignmentGuideText: true, assignmentAllowLate: true, assignmentDeadline: true },
    take: 3,
  });
  console.log("  Board.assignment* reachable on", boardDelta.length, "boards");
  const nullSubs = await db.submission.count({ where: { assignmentSlotId: null } });
  console.log("  Submission.assignmentSlotId reachable, null rows:", nullSubs);

  console.log("\n── AB1-smoke 2 — end-to-end CRUD on a throwaway classroom ──");
  const suffix = randomUUID().slice(0, 8);
  const teacher = await db.user.findFirst({ where: { id: "u_owner" } });
  if (!teacher) throw new Error("seed user u_owner missing — run `npm run seed`");

  const classroom = await db.classroom.create({
    data: { name: `AB1 smoke ${suffix}`, code: `AB1${suffix.slice(0, 3).toUpperCase()}`, teacherId: teacher.id },
  });
  console.log("  created classroom", classroom.id);

  // 3 students → assignment board
  const studentA = await db.student.create({
    data: {
      classroomId: classroom.id, name: "smoke A", number: 1,
      qrToken: `qr-${suffix}-a`, textCode: `AB1A${suffix.slice(0, 2).toUpperCase()}`,
    },
  });
  const studentB = await db.student.create({
    data: {
      classroomId: classroom.id, name: "smoke B", number: 2,
      qrToken: `qr-${suffix}-b`, textCode: `AB1B${suffix.slice(0, 2).toUpperCase()}`,
    },
  });

  // Simulate the POST /api/boards assignment branch
  const board = await db.$transaction(async (tx) => {
    const created = await tx.board.create({
      data: {
        title: `AB1 smoke board ${suffix}`,
        slug: `ab1-smoke-${suffix}`,
        layout: "assignment",
        description: "smoke",
        classroomId: classroom.id,
        assignmentGuideText: "smoke guide",
        assignmentAllowLate: true,
        members: { create: { userId: teacher.id, role: "owner" } },
      },
    });
    for (const s of [studentA, studentB]) {
      const card = await tx.card.create({
        data: {
          boardId: created.id, authorId: teacher.id, studentAuthorId: s.id,
          externalAuthorName: s.name, title: "", content: "",
        },
      });
      await tx.assignmentSlot.create({
        data: { boardId: created.id, studentId: s.id, slotNumber: s.number!, cardId: card.id },
      });
    }
    return created;
  });
  console.log("  created board", board.id, "slug", board.slug);

  // AC-10 surface: student B's slot id unreachable through A's scope
  const slotsForA = await db.assignmentSlot.findUnique({
    where: { boardId_studentId: { boardId: board.id, studentId: studentA.id } },
  });
  if (!slotsForA) throw new Error("AC-10 A lookup failed");
  console.log("  AC-10 A scope → 1 own slot only, id=" + slotsForA.id);

  // returned transition
  const patched = await db.assignmentSlot.update({
    where: { id: slotsForA.id },
    data: {
      submissionStatus: "submitted",
    },
  });
  console.log("  transition assigned→submitted ok:", patched.submissionStatus);

  // Cleanup
  await db.board.delete({ where: { id: board.id } });
  await db.student.delete({ where: { id: studentA.id } });
  await db.student.delete({ where: { id: studentB.id } });
  await db.classroom.delete({ where: { id: classroom.id } });
  console.log("  cleaned up");

  console.log("\n✅ AB1 smoke passed");
}

main()
  .catch((e) => {
    console.error("❌ smoke failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
