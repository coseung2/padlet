import { db } from "@/lib/db";

type CachedQuestion = {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  timeLimit: number;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // `cancelled` is flipped by ReadableStream.cancel() when the client
  // disconnects, so the recursive setTimeout poll stops immediately
  // instead of leaking a live DB loop per closed EventSource.
  let cancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let lastStatus = "";
      let lastCurrentQ = -2;
      let lastPlayersHash = "";
      let lastAnswerCount = -1;
      let questionsCache: CachedQuestion[] | null = null;

      function send(event: string, data: unknown) {
        if (cancelled) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream is closed — mark cancelled so the next poll exits.
          cancelled = true;
        }
      }

      async function poll() {
        if (cancelled) return;
        try {
          // Tick query — keep it narrow. status, currentQ, and player scores
          // are the only things that change on the "every second" boundary.
          const quiz = await db.quiz.findUnique({
            where: { id },
            select: {
              status: true,
              currentQ: true,
              players: {
                select: { id: true, nickname: true, score: true },
                orderBy: { score: "desc" },
              },
            },
          });

          if (!quiz) {
            send("error", { message: "Quiz not found" });
            controller.close();
            cancelled = true;
            return;
          }

          // Questions are immutable for a running quiz, so cache after the
          // first fetch and skip the join on every subsequent poll.
          if (!questionsCache) {
            questionsCache = await db.quizQuestion.findMany({
              where: { quizId: id },
              orderBy: { order: "asc" },
              select: {
                id: true,
                question: true,
                optionA: true,
                optionB: true,
                optionC: true,
                optionD: true,
                timeLimit: true,
              },
            });
          }

          // Status delta
          if (quiz.status !== lastStatus) {
            lastStatus = quiz.status;
            send("quiz-status", {
              status: quiz.status,
              currentQ: quiz.currentQ,
            });
          }

          // Current-question delta
          if (
            quiz.currentQ !== lastCurrentQ &&
            quiz.currentQ >= 0 &&
            quiz.currentQ < questionsCache.length
          ) {
            lastCurrentQ = quiz.currentQ;
            const q = questionsCache[quiz.currentQ];
            send("question", {
              index: quiz.currentQ,
              total: questionsCache.length,
              id: q.id,
              question: q.question,
              optionA: q.optionA,
              optionB: q.optionB,
              optionC: q.optionC,
              optionD: q.optionD,
              timeLimit: q.timeLimit,
            });
            // A new question resets the running answer tally.
            lastAnswerCount = -1;
          }

          // Player delta — hash id:score so score-only changes are detected
          // (the old code only noticed when the player count changed).
          const playersHash = quiz.players
            .map((p) => `${p.id}:${p.score}`)
            .join(",");
          if (playersHash !== lastPlayersHash) {
            lastPlayersHash = playersHash;
            send("players", {
              players: quiz.players.map((p) => ({
                id: p.id,
                nickname: p.nickname,
                score: p.score,
              })),
            });
          }

          // Answer distribution — only re-emit when the answer count for the
          // current question actually changed. Use a cheap count() tick,
          // then a scoped findMany(select: selected) only when it moves.
          if (
            quiz.currentQ >= 0 &&
            quiz.currentQ < questionsCache.length
          ) {
            const activeQuestionId = questionsCache[quiz.currentQ].id;
            const count = await db.quizAnswer.count({
              where: { questionId: activeQuestionId },
            });
            if (count !== lastAnswerCount) {
              lastAnswerCount = count;
              const answers = await db.quizAnswer.findMany({
                where: { questionId: activeQuestionId },
                select: { selected: true },
              });
              const distribution = { A: 0, B: 0, C: 0, D: 0 };
              for (const a of answers) {
                if (a.selected in distribution) {
                  distribution[a.selected as keyof typeof distribution]++;
                }
              }
              send("answers", {
                questionId: activeQuestionId,
                totalAnswers: count,
                totalPlayers: quiz.players.length,
                distribution,
              });
            }
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
            cancelled = true;
            return;
          }
        } catch (e) {
          console.error("[SSE poll]", e);
        }

        if (!cancelled) setTimeout(poll, 1000);
      }

      poll();
    },
    cancel() {
      cancelled = true;
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
