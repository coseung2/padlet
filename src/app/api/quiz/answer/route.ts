import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { questionId, playerId, selected, timeMs } = await req.json();

    if (!questionId || !playerId || !selected) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const question = await db.quizQuestion.findUnique({ where: { id: questionId } });
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Check if already answered
    const existing = await db.quizAnswer.findUnique({
      where: { questionId_playerId: { questionId, playerId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Already answered" }, { status: 400 });
    }

    const correct = selected === question.answer;
    // Score: max 1000, lose 50 per second (faster = more points)
    const points = correct ? Math.max(0, 1000 - Math.floor((timeMs || 0) / 20)) : 0;

    const answer = await db.quizAnswer.create({
      data: {
        questionId,
        playerId,
        selected,
        correct,
        timeMs: timeMs || 0,
      },
    });

    // Update player score
    if (points > 0) {
      await db.quizPlayer.update({
        where: { id: playerId },
        data: { score: { increment: points } },
      });
    }

    return NextResponse.json({
      answer,
      correct,
      correctAnswer: question.answer,
      points,
    });
  } catch (e) {
    console.error("[POST /api/quiz/answer]", e);
    return NextResponse.json({ error: "Answer failed" }, { status: 500 });
  }
}
