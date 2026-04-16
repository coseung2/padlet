/**
 * Phase 9 regression test — quiz-extensions permission gating.
 *
 * Uses the "as" cookie mock-auth switch to act as u_editor (non-owner
 * teacher) and u_viewer (read-only teacher). Neither owns a quiz-layout
 * board so every quiz management endpoint should return 403/404.
 *
 * Run: npx tsx tasks/2026-04-15-quiz-extensions/phase9/regression_tests/quiz_permissions_e2e.ts
 */

import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:3000";
const db = new PrismaClient();

let failures = 0;
function assertEq<T>(label: string, actual: T, expected: T) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function main() {
  // Create a board owned by u_owner plus one quiz to probe.
  const board = await db.board.create({
    data: {
      slug: `qa-perm-${Date.now()}`,
      title: "QA Permissions Board",
      layout: "quiz",
      members: { create: { userId: "u_owner", role: "owner" } },
    },
  });
  const quiz = await db.quiz.create({
    data: {
      boardId: board.id,
      title: "perm test",
      roomCode: String(Math.floor(100000 + Math.random() * 900000)),
      questions: {
        create: [
          { order: 0, question: "x?", optionA: "a", optionB: "b", optionC: "c", optionD: "d", answer: "A" },
        ],
      },
    },
  });

  try {
    // u_editor is a different mock teacher — not owner of this board.
    const asEditor = { cookie: "as=editor" };

    console.log("[non-owner teacher]");
    const r1 = await fetch(`${BASE}/api/quiz/${quiz.id}/report`, { headers: asEditor });
    assertEq("AC-B1-6 non-owner report → 403", r1.status, 403);
    const r2 = await fetch(`${BASE}/api/quiz/${quiz.id}/report.csv`, { headers: asEditor });
    assertEq("non-owner report.csv → 403", r2.status, 403);
    const r3 = await fetch(`${BASE}/api/quiz/${quiz.id}/clone`, {
      method: "POST",
      headers: { ...asEditor, "content-type": "application/json" },
      body: JSON.stringify({ boardId: board.id }),
    });
    assertEq("AC-B4-4 non-owner clone → 403", r3.status, 403);
    const r4 = await fetch(`${BASE}/api/quiz/${quiz.id}/questions`, {
      method: "PUT",
      headers: { ...asEditor, "content-type": "application/json" },
      body: JSON.stringify({ questions: [{ question: "x", optionA: "a", optionB: "b", optionC: "c", optionD: "d", answer: "A" }] }),
    });
    assertEq("AC-B3-5 non-owner PUT questions → 403", r4.status, 403);

    // Library scoped to editor's own owned boards (empty for this fixture).
    const r5 = await fetch(`${BASE}/api/quiz/library`, { headers: asEditor }).then((r) => r.json());
    assertEq("AC-B4-1 editor library does NOT include owner quiz", r5.items.some((it: { id: string }) => it.id === quiz.id), false);
  } finally {
    await db.quiz.delete({ where: { id: quiz.id } });
    await db.boardMember.deleteMany({ where: { boardId: board.id } });
    await db.board.delete({ where: { id: board.id } });
    await db.$disconnect();
  }

  console.log(failures === 0 ? "\nALL PERMISSIONS PASS" : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect().catch(() => {});
  process.exit(1);
});
