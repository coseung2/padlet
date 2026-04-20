// Vibe-arcade session streaming (Seed 13, AC-F3 / AC-F8 / AC-F9 / AC-N5).
// POST: student starts (or continues) a Sonnet coding session. SSE stream.
//
// This is the thin transport — quota check + persistence + stream forwarding.
// Encryption of the teacher API key is not implemented here (phase7 follow-up);
// we read SONNET_API_KEY env as a dev fallback with a clear TODO marker.

import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentStudent } from "@/lib/student-auth";
import { checkQuotaOrReject } from "@/lib/vibe-arcade/quota-ledger";
import { streamSonnet, DEFAULT_SYSTEM_PROMPT } from "@/lib/vibe-arcade/sonnet-provider";

const StartSchema = z.object({
  boardId: z.string().min(1),
  sessionId: z.string().optional(), // null = new session
  userMessage: z.string().min(1).max(4000),
});

// TODO(phase7-followup): replace with DB-backed decryption (CanvaConnectAccount-style).
function resolveTeacherApiKey(): string {
  const key = process.env.SONNET_API_KEY;
  if (!key) throw new Error("SONNET_API_KEY env not set (dev fallback)");
  return key;
}

export async function POST(req: Request) {
  const student = await getCurrentStudent();
  if (!student) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => null);
  const parsed = StartSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "bad_request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { boardId, sessionId, userMessage } = parsed.data;

  const cfg = await db.vibeArcadeConfig.findUnique({ where: { boardId } });
  if (!cfg?.enabled) {
    return new Response(JSON.stringify({ error: "gate_off" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const quota = await checkQuotaOrReject({
    classroomId: student.classroomId,
    studentId: student.id,
    classroomDailyTokenPool: cfg.classroomDailyTokenPool,
    perStudentDailyTokenCap: cfg.perStudentDailyTokenCap,
  });
  if (!quota.ok) {
    return new Response(JSON.stringify({ error: "quota_exhausted", reason: quota.reason }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Load or create the session row.
  let session = sessionId
    ? await db.vibeSession.findUnique({ where: { id: sessionId } })
    : null;
  if (session && session.studentId !== student.id) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!session) {
    session = await db.vibeSession.create({
      data: {
        studentId: student.id,
        classroomId: student.classroomId,
        messages: [],
      },
    });
  }

  const priorMessages = Array.isArray(session.messages)
    ? (session.messages as Array<{ role: "user" | "assistant"; content: string }>)
    : [];
  const nextMessages = [...priorMessages, { role: "user" as const, content: userMessage }];

  // SSE response.
  const encoder = new TextEncoder();
  let aborted = false;
  req.signal.addEventListener("abort", () => {
    aborted = true;
  });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        if (aborted) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          // Controller closed by abort — stop quietly.
        }
      };

      send({ type: "session", id: session!.id });

      try {
        const result = await streamSonnet({
          apiKey: resolveTeacherApiKey(),
          systemPrompt: DEFAULT_SYSTEM_PROMPT,
          messages: nextMessages,
          studentId: student.id,
          classroomId: student.classroomId,
          perStudentDailyTokenCap: cfg.perStudentDailyTokenCap,
          classroomDailyTokenPool: cfg.classroomDailyTokenPool,
          onDelta: (delta) => send({ type: "delta", text: delta }),
          onTokensUpdate: (tokensIn, tokensOut) =>
            send({ type: "usage", tokensIn, tokensOut }),
          onRefusal: () => send({ type: "refusal" }),
        });

        // Persist the assistant reply + usage.
        await db.vibeSession.update({
          where: { id: session!.id },
          data: {
            messages: [
              ...nextMessages,
              { role: "assistant", content: result.finalContent },
            ],
            tokensIn: { increment: result.tokensIn },
            tokensOut: { increment: result.tokensOut },
            refusalCount: {
              increment: result.stopReason === "refusal" ? 1 : 0,
            },
            status: result.stopReason === "refusal" ? "failed" : "active",
          },
        });

        send({ type: "done", stopReason: result.stopReason });
      } catch (err) {
        send({ type: "error", message: String((err as Error).message) });
      } finally {
        try {
          controller.close();
        } catch {
          // already closed (client abort)
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
