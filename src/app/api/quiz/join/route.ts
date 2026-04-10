import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { roomCode, nickname } = await req.json();

    if (!roomCode || !nickname?.trim()) {
      return NextResponse.json({ error: "roomCode and nickname required" }, { status: 400 });
    }

    const quiz = await db.quiz.findUnique({
      where: { roomCode },
      include: { questions: { select: { id: true } } },
    });

    if (!quiz) {
      return NextResponse.json({ error: "방을 찾을 수 없습니다" }, { status: 404 });
    }

    if (quiz.status === "finished") {
      return NextResponse.json({ error: "이미 종료된 퀴즈입니다" }, { status: 400 });
    }

    const player = await db.quizPlayer.create({
      data: {
        quizId: quiz.id,
        nickname: nickname.trim(),
      },
    });

    return NextResponse.json({
      player,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        status: quiz.status,
        questionCount: quiz.questions.length,
      },
    });
  } catch (e) {
    console.error("[POST /api/quiz/join]", e);
    return NextResponse.json({ error: "Join failed" }, { status: 500 });
  }
}
