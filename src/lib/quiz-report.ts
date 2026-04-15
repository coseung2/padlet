import { db } from "./db";
import type { QuizReportPayload } from "@/types/quiz";

/**
 * Build the teacher-facing report payload for a single quiz.
 * Caller is responsible for the canManageQuiz check — this helper
 * does NOT enforce authorization.
 */
export async function buildQuizReport(
  quizId: string
): Promise<QuizReportPayload | null> {
  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { order: "asc" } },
      players: {
        include: {
          student: { select: { id: true, name: true } },
          answers: true,
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!quiz) return null;

  const questions = quiz.questions.map((q) => ({
    id: q.id,
    order: q.order,
    question: q.question,
    answer: q.answer,
  }));

  // Players that submitted at least one answer.
  const playersWithAnswers = quiz.players.filter((p) => p.answers.length > 0);

  const players = quiz.players.map((p) => {
    const answerById = new Map(p.answers.map((a) => [a.questionId, a]));
    const rowAnswers = quiz.questions.map((q) => {
      const a = answerById.get(q.id);
      return {
        questionId: q.id,
        selected: a?.selected ?? null,
        correct: a ? a.correct : null,
        timeMs: a?.timeMs ?? null,
      };
    });
    const totalCorrect = rowAnswers.filter((r) => r.correct === true).length;
    return {
      playerId: p.id,
      studentId: p.studentId,
      name: p.student?.name ?? p.nickname,
      answers: rowAnswers,
      score: p.score,
      totalCorrect,
    };
  });

  // Summary is computed only over players who actually answered.
  let totalAnswers = 0;
  let totalCorrect = 0;
  let totalTimeMs = 0;
  let timedAnswers = 0;
  for (const p of playersWithAnswers) {
    for (const a of p.answers) {
      totalAnswers += 1;
      if (a.correct) totalCorrect += 1;
      if (a.timeMs > 0) {
        totalTimeMs += a.timeMs;
        timedAnswers += 1;
      }
    }
  }
  const avgCorrectRate = totalAnswers > 0 ? totalCorrect / totalAnswers : 0;
  const avgTimeMs = timedAnswers > 0 ? Math.round(totalTimeMs / timedAnswers) : 0;

  return {
    summary: {
      submittedCount: playersWithAnswers.length,
      avgCorrectRate,
      avgTimeMs,
    },
    questions,
    players,
  };
}

/**
 * Serialize report to CSV with UTF-8 BOM for Excel-kr compatibility.
 * Columns: 이름, 문항별(1.선택/정오), 총점, 맞힌 수
 */
export function reportToCsv(report: QuizReportPayload): string {
  const header = [
    "이름",
    ...report.questions.map(
      (q, i) => `Q${i + 1} 선택`
    ),
    ...report.questions.map((q, i) => `Q${i + 1} 정오`),
    "점수",
    "맞힌 수",
  ];
  const rows = report.players.map((p) => {
    const selects = report.questions.map((q) => {
      const a = p.answers.find((x) => x.questionId === q.id);
      return a?.selected ?? "";
    });
    const verdicts = report.questions.map((q) => {
      const a = p.answers.find((x) => x.questionId === q.id);
      if (!a || a.correct === null) return "";
      return a.correct ? "O" : "X";
    });
    return [p.name, ...selects, ...verdicts, String(p.score), String(p.totalCorrect)];
  });

  const escapeCell = (cell: string) => {
    if (/[",\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
    return cell;
  };
  const lines = [header, ...rows].map((row) => row.map(escapeCell).join(","));
  return "\uFEFF" + lines.join("\n");
}
