import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isCorrectMcq, isCorrectShort } from "@/lib/assessment-grading";
import type {
  McqQuestionPayload,
  McqAnswerPayload,
  ShortQuestionPayload,
  ShortAnswerPayload,
} from "@/types/assessment";

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

const BRIDGE_TOKEN = process.env.AURA_BRIDGE_TOKEN;

function checkAuth(req: Request): boolean {
  if (!BRIDGE_TOKEN) return false;
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice(7).trim() === BRIDGE_TOKEN;
}

export async function GET(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const classroomCode = url.searchParams.get("classroomCode");
  if (!classroomCode) {
    return NextResponse.json({ error: "classroomCode required" }, { status: 400 });
  }

  const classroom = await db.classroom.findUnique({
    where: { code: classroomCode },
    select: { id: true, name: true },
  });
  if (!classroom) {
    return NextResponse.json({ error: "classroom_not_found" }, { status: 404 });
  }

  const templates = await db.assessmentTemplate.findMany({
    where: { classroomId: classroom.id },
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
    return {
      id: t.id,
      title: t.title,
      date: t.createdAt.toISOString(),
      students,
    };
  });

  return NextResponse.json({ assessments });
}
