import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let lastStatus = "";
      let lastQ = -2;
      let lastPlayerCount = -1;

      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      async function poll() {
        try {
          const quiz = await db.quiz.findUnique({
            where: { id },
            include: {
              questions: { orderBy: { order: "asc" }, include: { answers: true } },
              players: { orderBy: { score: "desc" } },
            },
          });

          if (!quiz) {
            send("error", { message: "Quiz not found" });
            controller.close();
            return;
          }

          // Send status updates
          if (quiz.status !== lastStatus) {
            lastStatus = quiz.status;
            send("quiz-status", { status: quiz.status, currentQ: quiz.currentQ });
          }

          // Send current question (without correct answer)
          if (quiz.currentQ !== lastQ && quiz.currentQ >= 0 && quiz.currentQ < quiz.questions.length) {
            lastQ = quiz.currentQ;
            const q = quiz.questions[quiz.currentQ];
            send("question", {
              index: quiz.currentQ,
              total: quiz.questions.length,
              id: q.id,
              question: q.question,
              optionA: q.optionA,
              optionB: q.optionB,
              optionC: q.optionC,
              optionD: q.optionD,
              timeLimit: q.timeLimit,
            });
          }

          // Send player list
          if (quiz.players.length !== lastPlayerCount) {
            lastPlayerCount = quiz.players.length;
            send("players", {
              players: quiz.players.map((p) => ({
                id: p.id,
                nickname: p.nickname,
                score: p.score,
              })),
            });
          }

          // Send answer results for current question if all answered or question changed
          if (quiz.currentQ >= 0 && quiz.currentQ < quiz.questions.length) {
            const q = quiz.questions[quiz.currentQ];
            const answerCount = q.answers.length;
            const distribution = { A: 0, B: 0, C: 0, D: 0 };
            for (const a of q.answers) {
              if (a.selected in distribution) {
                distribution[a.selected as keyof typeof distribution]++;
              }
            }
            send("answers", {
              questionId: q.id,
              totalAnswers: answerCount,
              totalPlayers: quiz.players.length,
              distribution,
            });
          }

          if (quiz.status === "finished") {
            send("finished", {
              players: quiz.players.map((p) => ({
                id: p.id,
                nickname: p.nickname,
                score: p.score,
              })),
            });
            controller.close();
            return;
          }
        } catch (e) {
          console.error("[SSE poll]", e);
        }

        setTimeout(poll, 1000);
      }

      poll();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
