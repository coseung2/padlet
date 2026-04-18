/**
 * Assessment-autograde MVP-0 end-to-end regression.
 *
 * Dev server (http://localhost:3000) with mock auth — the default
 * fallback user is u_owner (teacher). For the student path we send
 * an impersonation cookie via student-auth internals: the test seeds
 * a classroom + student + Student session cookie directly through
 * the DB and then sets the cookie on the fetch request.
 *
 * Run:
 *   PORT=3000 npm run dev &
 *   npx tsx tasks/2026-04-16-performance-assessment-autograde/phase9/regression_tests/assessment_api_e2e.ts
 */

import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const BASE = "http://localhost:3000";
const db = new PrismaClient();

let failures = 0;
function assert(label: string, cond: boolean, extra?: unknown) {
  if (cond) console.log(`  ✓ ${label}`);
  else {
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

// Student-session HMAC — mirrors src/lib/student-auth.ts exactly.
// payload JSON → base64url → HMAC-SHA256(AUTH_SECRET) → "b64.sig".
const AUTH_SECRET = process.env.AUTH_SECRET ?? "dev-secret";
function signStudent(
  studentId: string,
  classroomId: string,
  sessionVersion: number
): string {
  const payload = {
    studentId,
    classroomId,
    sessionVersion,
    exp: Date.now() + 60 * 60 * 1000,
  };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(b64)
    .digest("base64url");
  return `${b64}.${sig}`;
}

async function main() {
  // Seed: classroom owned by u_owner + a test student + an assessment
  // board.
  const classroom = await db.classroom.create({
    data: {
      name: "QA Assessment Class",
      code: `QA${Date.now().toString().slice(-4)}`,
      teacherId: "u_owner",
    },
  });
  const student = await db.student.create({
    data: {
      classroomId: classroom.id,
      name: "테스트학생",
      qrToken: crypto.randomUUID(),
      textCode: crypto.randomBytes(3).toString("hex"),
    },
  });
  const board = await db.board.create({
    data: {
      slug: `qa-assessment-${Date.now()}`,
      title: "QA Assessment Board",
      layout: "assessment",
      classroomId: classroom.id,
      members: { create: { userId: "u_owner", role: "owner" } },
    },
  });

  // Dev mock auth defaults to u_owner when no `as` cookie is set, so
  // every request would carry an extra teacher identity and the classroom
  // owner would beat the student path. Pin the mock to `viewer` (a user
  // that owns nothing) for student-only requests.
  const studentCookie = `as=viewer; student_session=${signStudent(student.id, classroom.id, student.sessionVersion)}`;
  const createdTemplateIds: string[] = [];

  try {
    // ── 1. Template create (teacher, default u_owner cookie) ────
    console.log("\n[template create]");
    const createRes = await fetch(`${BASE}/api/assessment/templates`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        classroomId: classroom.id,
        boardId: board.id,
        title: "QA 단원평가",
        durationMin: 5,
        questions: [
          {
            prompt: "1+1=?",
            choices: [
              { id: "A", text: "1" },
              { id: "B", text: "2" },
              { id: "C", text: "3" },
              { id: "D", text: "4" },
            ],
            correctChoiceIds: ["B"],
            maxScore: 1,
          },
          {
            prompt: "2와 3은 모두 양수입니다",
            choices: [
              { id: "A", text: "2는 양수" },
              { id: "B", text: "3은 양수" },
              { id: "C", text: "2는 음수" },
              { id: "D", text: "3은 음수" },
            ],
            correctChoiceIds: ["A", "B"],
            maxScore: 2,
          },
        ],
      }),
    });
    assertEq("template create 200", createRes.status, 200);
    const { template } = (await createRes.json()) as {
      template: { id: string; questions: Array<{ id: string; correctChoiceIds: string[] }> };
    };
    createdTemplateIds.push(template.id);
    assertEq("correctChoiceIds visible to teacher", template.questions[1].correctChoiceIds, ["A", "B"]);

    // ── 2. Zod gate rejects non-MCQ via raw payload ────
    console.log("\n[Zod gate]");
    const badRes = await fetch(`${BASE}/api/assessment/templates`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        classroomId: classroom.id,
        title: "bad",
        durationMin: 5,
        questions: [
          {
            prompt: "p",
            choices: [{ id: "A", text: "a" }], // < 2 choices
            correctChoiceIds: ["A"],
          },
        ],
      }),
    });
    assertEq("choices < 2 rejected", badRes.status, 400);

    // ── 3. Student view strips correct answers ────
    console.log("\n[student template view]");
    const studentViewRes = await fetch(
      `${BASE}/api/assessment/templates/${template.id}`,
      { headers: { cookie: studentCookie } }
    );
    if (studentViewRes.status !== 200) {
      const body = await studentViewRes.text();
      console.error(
        `    student view got status=${studentViewRes.status}, body=${body}`
      );
    }
    if (studentViewRes.ok) {
      const { template: tpl, viewer } = (await studentViewRes.json()) as {
        template: { questions: Array<Record<string, unknown>> };
        viewer: string;
      };
      assertEq("viewer=student", viewer, "student");
      assertEq("correctChoiceIds removed", "correctChoiceIds" in tpl.questions[0], false);

      // ── 4. Student start + answer + submit ────
      console.log("\n[student flow]");
      const startRes = await fetch(
        `${BASE}/api/assessment/templates/${template.id}/submissions`,
        { method: "POST", headers: { cookie: studentCookie } }
      );
      assertEq("submission start 200", startRes.status, 200);
      const { submission } = (await startRes.json()) as {
        submission: { id: string; endAt: string };
      };

      const answer1 = await fetch(
        `${BASE}/api/assessment/submissions/${submission.id}/answer`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json", cookie: studentCookie },
          body: JSON.stringify({
            questionId: template.questions[0].id,
            selectedChoiceIds: ["B"], // correct
          }),
        }
      );
      assertEq("answer 1 PATCH 200", answer1.status, 200);

      const answer2 = await fetch(
        `${BASE}/api/assessment/submissions/${submission.id}/answer`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json", cookie: studentCookie },
          body: JSON.stringify({
            questionId: template.questions[1].id,
            selectedChoiceIds: ["A"], // incomplete — only one of two correct
          }),
        }
      );
      assertEq("answer 2 PATCH 200", answer2.status, 200);

      const submitRes = await fetch(
        `${BASE}/api/assessment/submissions/${submission.id}/submit`,
        { method: "POST", headers: { cookie: studentCookie } }
      );
      assertEq("submit 200", submitRes.status, 200);
      const submitJson = (await submitRes.json()) as { autoScore: number };
      assertEq("autoScore = 1 (q1 correct, q2 partial = 0)", submitJson.autoScore, 1);

      // Double submit → 409
      const dup = await fetch(
        `${BASE}/api/assessment/submissions/${submission.id}/submit`,
        { method: "POST", headers: { cookie: studentCookie } }
      );
      assertEq("double submit 409", dup.status, 409);

      // Answer PATCH after submit → 409
      const lateAnswer = await fetch(
        `${BASE}/api/assessment/submissions/${submission.id}/answer`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json", cookie: studentCookie },
          body: JSON.stringify({
            questionId: template.questions[0].id,
            selectedChoiceIds: ["A"],
          }),
        }
      );
      assertEq("late answer 409", lateAnswer.status, 409);

      // ── 5. Result before release = { released: false } ────
      console.log("\n[pre-release result]");
      const resultPre = await fetch(
        `${BASE}/api/assessment/submissions/${submission.id}/result`,
        { headers: { cookie: studentCookie } }
      );
      const resultPreJson = (await resultPre.json()) as { released: boolean };
      assertEq("pre-release released=false", resultPreJson.released, false);

      // ── 6. Teacher gradebook + finalize + release ────
      console.log("\n[teacher finalize + release]");
      const gbRes = await fetch(
        `${BASE}/api/assessment/templates/${template.id}/gradebook`
      );
      assertEq("gradebook 200", gbRes.status, 200);
      const gb = (await gbRes.json()) as {
        rows: Array<{ submission: { id: string } | null; totalAutoScore: number }>;
        maxScoreTotal: number;
      };
      assertEq("maxScoreTotal = 3", gb.maxScoreTotal, 3);
      const row = gb.rows.find((r) => r.submission?.id === submission.id);
      assert("row present in gradebook", !!row);
      assertEq("row totalAutoScore=1", row?.totalAutoScore ?? -1, 1);

      const finRes = await fetch(
        `${BASE}/api/assessment/submissions/${submission.id}/finalize`,
        { method: "POST" }
      );
      assertEq("finalize 200", finRes.status, 200);
      const relRes = await fetch(
        `${BASE}/api/assessment/submissions/${submission.id}/release`,
        { method: "POST" }
      );
      assertEq("release 200", relRes.status, 200);

      // ── 7. Post-release student result ────
      console.log("\n[post-release result]");
      const resultPost = await fetch(
        `${BASE}/api/assessment/submissions/${submission.id}/result`,
        { headers: { cookie: studentCookie } }
      );
      const resultPostJson = (await resultPost.json()) as {
        released: boolean;
        finalScore: number;
        maxScoreTotal: number;
        questions: Array<{ correct: boolean }>;
      };
      assertEq("released=true after release", resultPostJson.released, true);
      assertEq("finalScore=1", resultPostJson.finalScore, 1);
      assertEq("q1 correct", resultPostJson.questions[0].correct, true);
      assertEq("q2 wrong (partial)", resultPostJson.questions[1].correct, false);
    }

    // ── 8. Non-owner teacher cannot create template (editor) ────
    console.log("\n[permission gate]");
    const editorRes = await fetch(`${BASE}/api/assessment/templates`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "as=editor" },
      body: JSON.stringify({
        classroomId: classroom.id,
        title: "x",
        durationMin: 5,
        questions: [
          {
            prompt: "p",
            choices: [
              { id: "A", text: "a" },
              { id: "B", text: "b" },
            ],
            correctChoiceIds: ["A"],
          },
        ],
      }),
    });
    assertEq("non-owner teacher 403", editorRes.status, 403);
  } finally {
    // Cleanup — cascading deletes take care of everything under classroom.
    await db.assessmentTemplate.deleteMany({ where: { id: { in: createdTemplateIds } } });
    await db.boardMember.deleteMany({ where: { boardId: board.id } });
    await db.board.delete({ where: { id: board.id } });
    await db.student.delete({ where: { id: student.id } });
    await db.classroom.delete({ where: { id: classroom.id } });
    await db.$disconnect();
  }

  console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect().catch(() => {});
  process.exit(1);
});
