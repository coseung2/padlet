/**
 * Phase 9 regression test — quiz-extensions API end-to-end.
 *
 * Runs against the local dev server (http://localhost:3000) using the
 * mock-auth "owner" identity (dev fallback in src/lib/auth.ts) so the
 * scenarios mirror what a signed-in teacher would see.
 *
 * Run:
 *   PORT=3000 npm run dev &
 *   npx tsx tasks/2026-04-15-quiz-extensions/phase9/regression_tests/quiz_api_e2e.ts
 *
 * The script cleans up everything it creates (seed Board + every quiz
 * row whose parentQuizId chain leads back to the seed). It fails loud
 * and exits non-zero on the first unmet assertion.
 */

import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:3000";
const db = new PrismaClient();
const OWNER_ID = "u_owner";

let failures = 0;
function assert(label: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ ${label}`, extra ?? "");
  }
}
function assertEq<T>(label: string, actual: T, expected: T) {
  assert(
    label,
    JSON.stringify(actual) === JSON.stringify(expected),
    `\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`
  );
}

async function main() {
  // ── 0. Seed a quiz board owned by u_owner. ─────────────────────────
  const board = await db.board.create({
    data: {
      slug: `qa-quiz-${Date.now()}`,
      title: "QA Quiz Board",
      layout: "quiz",
      description: "phase9 e2e fixture — safe to delete",
      members: { create: { userId: OWNER_ID, role: "owner" } },
    },
  });
  const createdQuizIds: string[] = [];

  try {
    // ── 1. Create a seed quiz directly in DB (LLM stub) so we can
    //      exercise the report / edit / clone / library endpoints
    //      without spending API credits.
    const quiz = await db.quiz.create({
      data: {
        boardId: board.id,
        title: "QA 샘플 퀴즈",
        roomCode: String(Math.floor(100000 + Math.random() * 900000)),
        difficulty: "medium",
        questions: {
          create: [
            { order: 0, question: "1+1=?", optionA: "1", optionB: "2", optionC: "3", optionD: "4", answer: "B" },
            { order: 1, question: "2×3=?", optionA: "5", optionB: "6", optionC: "7", optionD: "8", answer: "B" },
          ],
        },
      },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    createdQuizIds.push(quiz.id);

    // Simulate a submitted player (for report coverage).
    const player = await db.quizPlayer.create({
      data: {
        quizId: quiz.id,
        nickname: `=HACKER${Date.now()}`, // intentional CSV-injection probe
        score: 50,
      },
    });
    await db.quizAnswer.createMany({
      data: [
        { questionId: quiz.questions[0].id, playerId: player.id, selected: "B", correct: true, timeMs: 2100 },
        { questionId: quiz.questions[1].id, playerId: player.id, selected: "A", correct: false, timeMs: 3400 },
      ],
    });

    // ── 2. AC-B1-1 / AC-B1-2 / AC-B1-3 — report JSON shape. ─────────
    console.log("\n[B1 리포트 JSON]");
    const reportRes = await fetch(`${BASE}/api/quiz/${quiz.id}/report`);
    assertEq("AC-B1-6 teacher access OK (200)", reportRes.status, 200);
    const report = (await reportRes.json()) as {
      summary: { submittedCount: number; avgCorrectRate: number; avgTimeMs: number };
      questions: Array<{ id: string }>;
      players: Array<{ playerId: string; totalCorrect: number; name: string }>;
    };
    assertEq("summary.submittedCount=1", report.summary.submittedCount, 1);
    assertEq("summary.avgCorrectRate=0.5", report.summary.avgCorrectRate, 0.5);
    assertEq("questions.length=2", report.questions.length, 2);
    assertEq("players[0].totalCorrect=1", report.players[0].totalCorrect, 1);

    // ── 3. AC-B1-4 — CSV download + formula-injection guard. ────────
    console.log("\n[B1 CSV 다운로드]");
    const csvRes = await fetch(`${BASE}/api/quiz/${quiz.id}/report.csv`);
    assertEq("CSV route returns 200", csvRes.status, 200);
    const ctype = csvRes.headers.get("content-type") ?? "";
    assert("Content-Type csv utf-8", ctype.includes("text/csv") && ctype.includes("utf-8"));
    const disp = csvRes.headers.get("content-disposition") ?? "";
    assert("Content-Disposition attachment", disp.includes("attachment") && disp.includes(quiz.id));
    // fetch().text() strips the UTF-8 BOM during decoding, so inspect the
    // raw bytes. Expect EF BB BF (UTF-8 encoding of U+FEFF).
    const csvBytes = Buffer.from(await csvRes.arrayBuffer());
    assert(
      "BOM present (bytes EF BB BF)",
      csvBytes[0] === 0xef && csvBytes[1] === 0xbb && csvBytes[2] === 0xbf
    );
    const csvBody = csvBytes.toString("utf8").replace(/^\uFEFF/, "");
    assert(
      "B-1 CSV formula injection guard (=HACKER prefixed with ')",
      csvBody.includes(`'=HACKER`)
    );

    // ── 4. AC-B1-5 — empty report (quiz with no answers). ───────────
    console.log("\n[B1 빈 상태]");
    const emptyQuiz = await db.quiz.create({
      data: {
        boardId: board.id,
        title: "빈 퀴즈",
        roomCode: String(Math.floor(100000 + Math.random() * 900000)),
        questions: { create: [{ order: 0, question: "x?", optionA: "a", optionB: "b", optionC: "c", optionD: "d", answer: "A" }] },
      },
    });
    createdQuizIds.push(emptyQuiz.id);
    const emptyRes = await fetch(`${BASE}/api/quiz/${emptyQuiz.id}/report`).then((r) => r.json());
    assertEq("empty quiz submittedCount=0", emptyRes.summary.submittedCount, 0);
    assertEq("empty quiz players=[]", emptyRes.players, []);

    // ── 5. AC-B2 — difficulty + countMode persisted on create.
    //      (Draft endpoint requires LLM API key so we skip direct
    //      LLM call and exercise the draft-promotion path that skips
    //      the LLM instead.)
    console.log("\n[B2/B3 draft 승격 경로]");
    const fd = new FormData();
    fd.append("boardId", board.id);
    fd.append("difficulty", "hard");
    fd.append("countMode", "fixed");
    fd.append("questionCount", "2");
    fd.append("title", "B3 저장 테스트");
    fd.append(
      "draftQuestions",
      JSON.stringify([
        { question: "Q1", optionA: "a", optionB: "b", optionC: "c", optionD: "d", answer: "A" },
        { question: "Q2", optionA: "a", optionB: "b", optionC: "c", optionD: "d", answer: "B" },
      ])
    );
    const createRes = await fetch(`${BASE}/api/quiz/create`, { method: "POST", body: fd });
    assertEq("AC-B3-4 create(200)", createRes.status, 200);
    const createJson = (await createRes.json()) as { quiz: { id: string; difficulty: string; questions: unknown[] } };
    createdQuizIds.push(createJson.quiz.id);
    assertEq("AC-B2-4 difficulty=hard persisted", createJson.quiz.difficulty, "hard");
    assertEq("created 2 questions", createJson.quiz.questions.length, 2);

    // ── 6. AC-B3-5 / PUT questions — transactional replace. ─────────
    console.log("\n[B3 PUT /questions]");
    const putRes = await fetch(`${BASE}/api/quiz/${createJson.quiz.id}/questions`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        questions: [
          { question: "Q1'", optionA: "1", optionB: "2", optionC: "3", optionD: "4", answer: "C" },
        ],
      }),
    });
    assertEq("PUT 200", putRes.status, 200);
    const putJson = (await putRes.json()) as { quiz: { questions: Array<{ question: string; answer: string; order: number }> } };
    assertEq("replace reduces count to 1", putJson.quiz.questions.length, 1);
    assertEq("new question text", putJson.quiz.questions[0].question, "Q1'");
    assertEq("new answer", putJson.quiz.questions[0].answer, "C");

    // ── 7. AC-B4 — clone into the same board. ──────────────────────
    console.log("\n[B4 clone]");
    const cloneRes = await fetch(`${BASE}/api/quiz/${quiz.id}/clone`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ boardId: board.id }),
    });
    assertEq("clone 200", cloneRes.status, 200);
    const cloneJson = (await cloneRes.json()) as { quiz: { id: string; parentQuizId: string; roomCode: string; questions: unknown[] } };
    createdQuizIds.push(cloneJson.quiz.id);
    assertEq("AC-B4-3 parentQuizId preserved", cloneJson.quiz.parentQuizId, quiz.id);
    assert("clone has new roomCode", cloneJson.quiz.roomCode !== quiz.roomCode);
    assertEq("clone copied all questions", cloneJson.quiz.questions.length, quiz.questions.length);

    // ── 8. AC-B4-1 — library lists teacher's quizzes. ──────────────
    console.log("\n[B4 library]");
    const libRes = await fetch(`${BASE}/api/quiz/library`);
    assertEq("library 200", libRes.status, 200);
    const libJson = (await libRes.json()) as { items: Array<{ id: string; difficulty: string | null; questionCount: number }>; nextCursor: string | null };
    const ids = libJson.items.map((it) => it.id);
    assert("library contains seed quiz", ids.includes(quiz.id));
    assert("library contains cloned quiz", ids.includes(cloneJson.quiz.id));
    const seedItem = libJson.items.find((it) => it.id === quiz.id);
    assertEq("library reports difficulty=medium", seedItem?.difficulty ?? null, "medium");

    // ── 9. Concurrent active-edit rejection. ───────────────────────
    console.log("\n[B3 active 중 편집 차단]");
    await db.quiz.update({ where: { id: createJson.quiz.id }, data: { status: "active" } });
    const activePut = await fetch(`${BASE}/api/quiz/${createJson.quiz.id}/questions`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questions: [{ question: "x", optionA: "a", optionB: "b", optionC: "c", optionD: "d", answer: "A" }] }),
    });
    assertEq("PUT while active → 409", activePut.status, 409);
  } finally {
    // ── cleanup ────────────────────────────────────────────────────
    if (createdQuizIds.length > 0) {
      await db.quiz.deleteMany({ where: { id: { in: createdQuizIds } } });
    }
    await db.quiz.deleteMany({ where: { boardId: board.id } }); // belt + braces
    await db.boardMember.deleteMany({ where: { boardId: board.id } });
    await db.board.delete({ where: { id: board.id } });
    await db.$disconnect();
  }

  console.log("\n============================");
  console.log(failures === 0 ? "ALL ASSERTIONS PASSED" : `${failures} FAILED`);
  console.log("============================");
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect().catch(() => {});
  process.exit(1);
});
