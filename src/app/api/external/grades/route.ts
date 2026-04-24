import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isCorrectMcq, isCorrectShort } from "@/lib/assessment-grading";
import type {
  McqQuestionPayload,
  McqAnswerPayload,
  ShortQuestionPayload,
  ShortAnswerPayload,
} from "@/types/assessment";
import {
  resolveAuraBridgeAuth,
  deniedResponse,
  bridgeDeprecationHeaders,
} from "@/lib/aura-bridge-auth";

/**
 * GET /api/external/grades?classroomCode=XXXXXX
 *
 * Server-to-server endpoint for aura to fetch assessment results.
 * Auth: Bearer token matching AURA_BRIDGE_TOKEN env var (shared secret).
 * Scope: teacher-only data (student scores, wrong questions).
 *
 * Response shape (contract with aura /reports page):
 * {
 *   assessments: [{
 *     id, title, date,
 *     students: [{
 *       number, name, score, totalScore,
 *       wrongQuestions: number[]   // 1-indexed question numbers
 *     }]
 *   }]
 * }
 */

export async function GET(req: Request) {
  const auth = await resolveAuraBridgeAuth(req);
  if (auth.mode === "denied") return deniedResponse(auth.reason);

  const url = new URL(req.url);
  const classroomCode = url.searchParams.get("classroomCode");

  // OAuth: token → teacher → owned classrooms (+optional classroomCode filter).
  // Bridge: classroomCode 필수, 어떤 학급이든 lookup.
  let classroomIds: string[] = [];
  const classroomCodeById = new Map<string, string>();

  if (auth.mode === "oauth") {
    if (!auth.scope.split(/\s+/).includes("external:read")) {
      return NextResponse.json({ error: "insufficient_scope" }, { status: 403 });
    }
    const where: { teacherId: string; code?: string } = { teacherId: auth.teacherId };
    if (classroomCode) where.code = classroomCode;
    const owned = await db.classroom.findMany({
      where,
      select: { id: true, code: true },
    });
    classroomIds = owned.map((c) => c.id);
    for (const c of owned) classroomCodeById.set(c.id, c.code);
    if (classroomIds.length === 0) return NextResponse.json({ assessments: [] });
  } else {
    if (!classroomCode) {
      return NextResponse.json({ error: "classroomCode required" }, { status: 400 });
    }
    const classroom = await db.classroom.findUnique({
      where: { code: classroomCode },
      select: { id: true, code: true },
    });
    if (!classroom) {
      return NextResponse.json({ error: "classroom_not_found" }, { status: 404 });
    }
    classroomIds = [classroom.id];
    classroomCodeById.set(classroom.id, classroom.code);
  }

  const templates = await db.assessmentTemplate.findMany({
    where: { classroomId: { in: classroomIds } },
    orderBy: { createdAt: "desc" },
    include: {
      questions: { orderBy: { order: "asc" } },
      submissions: {
        where: { status: "submitted" },
        include: {
          student: { select: { number: true, name: true } },
          answers: true,
          gradebookEntry: { select: { finalScore: true, releasedAt: true } },
        },
      },
    },
  });

  const assessments = templates.map((t) => {
    const totalScore = t.questions.reduce((acc, q) => acc + q.maxScore, 0);
    const students = t.submissions
      .filter((s) => s.gradebookEntry?.releasedAt)
      .map((s) => {
        const answerByQid = new Map(s.answers.map((a) => [a.questionId, a]));
        const wrongQuestions: number[] = [];
        for (const q of t.questions) {
          const a = answerByQid.get(q.id);
          let correct = false;
          if (q.kind === "MANUAL") {
            correct = a?.manualScore !== null && a?.manualScore === q.maxScore;
          } else if (q.kind === "SHORT") {
            const qp = q.payload as ShortQuestionPayload;
            const text = a ? (a.payload as ShortAnswerPayload).textAnswer : "";
            correct = isCorrectShort(qp.correctAnswers, text);
          } else {
            const qp = q.payload as McqQuestionPayload;
            const selected = a ? (a.payload as McqAnswerPayload).selectedChoiceIds : [];
            correct = isCorrectMcq(qp.correctChoiceIds, selected);
          }
          if (!correct) wrongQuestions.push(q.order + 1);
        }
        return {
          number: s.student.number,
          name: s.student.name,
          score: s.gradebookEntry!.finalScore,
          totalScore,
          wrongQuestions,
        };
      });
    // OAuth 모드는 응답에 여러 학급이 섞일 수 있어 assessment 마다 classroomCode
    // 를 채워준다. Bridge 모드는 단일 학급이라 classroomCode 가 query 와 동일.
    return {
      id: t.id,
      title: t.title,
      date: t.createdAt.toISOString(),
      classroomCode: classroomCodeById.get(t.classroomId) ?? "",
      students,
    };
  });

  // Bridge 모드 응답엔 deprecation 헤더를 첨부해 Aura 가 OAuth 로 전환하도록
  // 신호. OAuth 모드는 헤더 없음 (정상 경로).
  return NextResponse.json(
    { assessments },
    auth.mode === "bridge"
      ? { headers: bridgeDeprecationHeaders() }
      : undefined
  );
}
