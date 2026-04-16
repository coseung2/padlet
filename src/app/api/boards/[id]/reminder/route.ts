import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ReminderSchema } from "@/lib/assignment-schemas";
import { assignmentChannelKey, publish } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Per-board 5-minute cooldown. Pure in-memory — matches the dev fallback in
// rate-limit.ts. Production multi-instance is acceptable because cooldown
// under-enforcement (one node at a time) still caps outbound reminder count
// by the single-teacher access pattern (only one teacher owns the board).
const COOLDOWN_MS = 5 * 60 * 1000;
const lastReminderByBoard = new Map<string, number>();

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: boardId } = await ctx.params;
  const user = await getCurrentUser();

  const board = await db.board.findUnique({
    where: { id: boardId },
    select: { id: true, classroom: { select: { teacherId: true } } },
  });
  if (!board) return NextResponse.json({ error: "board_not_found" }, { status: 404 });
  if (!board.classroom || board.classroom.teacherId !== user.id) {
    return NextResponse.json({ error: "not_classroom_teacher" }, { status: 403 });
  }

  const now = Date.now();
  const last = lastReminderByBoard.get(boardId) ?? 0;
  if (now - last < COOLDOWN_MS) {
    const retryAfter = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
    return NextResponse.json(
      { error: "reminder_cooldown", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = ReminderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed" }, { status: 400 });
  }

  const targets = await db.assignmentSlot.findMany({
    where: {
      boardId,
      submissionStatus: "assigned",
      ...(parsed.data.studentIds && parsed.data.studentIds.length > 0
        ? { studentId: { in: parsed.data.studentIds } }
        : {}),
    },
    select: { studentId: true },
  });
  const studentIds = targets.map((t) => t.studentId);

  lastReminderByBoard.set(boardId, now);

  // v1: in-app badge delivery uses no-op publish. When the notification/badge
  // pipeline is wired, it will subscribe to this event. No email sent.
  await publish({
    channel: assignmentChannelKey(boardId),
    type: "reminder.issued",
    payload: {
      boardId,
      studentIds,
      issuedAt: new Date(now).toISOString(),
    },
  });

  return NextResponse.json({
    remindedCount: studentIds.length,
    cooldownSeconds: Math.ceil(COOLDOWN_MS / 1000),
  });
}
