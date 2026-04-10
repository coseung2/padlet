import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateQuizFromText } from "@/lib/quiz-llm";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const formData = await req.formData();
    const boardId = formData.get("boardId") as string;
    const textContent = formData.get("text") as string | null;
    const file = formData.get("file") as File | null;
    const numQuestions = parseInt(formData.get("numQuestions") as string || "5", 10);

    if (!boardId) {
      return NextResponse.json({ error: "boardId required" }, { status: 400 });
    }

    // Get LLM settings from cookies
    const cookies = req.headers.get("cookie") ?? "";
    const providerMatch = cookies.match(/llm_provider=([^;]+)/);
    const keyMatch = cookies.match(/llm_api_key=([^;]+)/);
    const provider = (providerMatch?.[1] ?? "openai") as "openai" | "anthropic";
    const apiKey = keyMatch?.[1] ? decodeURIComponent(keyMatch[1]) : "";

    if (!apiKey) {
      return NextResponse.json(
        { error: "llm_not_configured", message: "LLM API 키를 먼저 설정해주세요." },
        { status: 400 }
      );
    }

    // Extract text
    let text = textContent ?? "";

    if (file && !text) {
      if (file.type === "application/pdf") {
        const pdfParse = (await import("pdf-parse")).default;
        const buffer = Buffer.from(await file.arrayBuffer());
        const pdf = await pdfParse(buffer);
        text = pdf.text;
      } else {
        // Plain text or other
        text = await file.text();
      }
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "No text content provided" }, { status: 400 });
    }

    // Generate quiz via LLM
    const questions = await generateQuizFromText(text, apiKey, numQuestions, provider);

    // Generate unique 6-digit room code
    let roomCode: string;
    do {
      roomCode = String(Math.floor(100000 + Math.random() * 900000));
    } while (await db.quiz.findUnique({ where: { roomCode } }));

    // Create quiz + questions
    const quiz = await db.quiz.create({
      data: {
        boardId,
        title: file?.name ?? "퀴즈",
        sourceFile: file?.name ?? null,
        sourceText: text.slice(0, 5000),
        roomCode,
        questions: {
          create: questions.map((q, i) => ({
            order: i,
            question: q.question,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            answer: q.answer,
          })),
        },
      },
      include: { questions: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ quiz });
  } catch (e: any) {
    console.error("[POST /api/quiz/create]", e);
    return NextResponse.json({ error: e.message ?? "Quiz creation failed" }, { status: 500 });
  }
}
