/**
 * PATCH /api/event/metadata  { boardId, ...eventMetadataSchema }
 *
 * Teacher-only. Updates event-signup-specific fields on a Board.
 * customQuestions array is stringified to JSON before storage.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { eventMetadataSchema } from "@/lib/event/schemas";

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const boardId = (raw as { boardId?: unknown })?.boardId;
  if (typeof boardId !== "string") return NextResponse.json({ error: "boardId_required" }, { status: 400 });
  try {
    await requirePermission(boardId, user.id, "edit");
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw e;
  }
  const parsed = eventMetadataSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload", detail: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;
  const update: Record<string, unknown> = {};
  if (data.layout !== undefined) update.layout = data.layout;
  if (data.accessMode !== undefined) update.accessMode = data.accessMode;
  if (data.eventPosterUrl !== undefined) update.eventPosterUrl = data.eventPosterUrl;
  if (data.applicationStart !== undefined) update.applicationStart = data.applicationStart ? new Date(data.applicationStart) : null;
  if (data.applicationEnd !== undefined) update.applicationEnd = data.applicationEnd ? new Date(data.applicationEnd) : null;
  if (data.eventStart !== undefined) update.eventStart = data.eventStart ? new Date(data.eventStart) : null;
  if (data.eventEnd !== undefined) update.eventEnd = data.eventEnd ? new Date(data.eventEnd) : null;
  if (data.venue !== undefined) update.venue = data.venue;
  if (data.maxSelections !== undefined) update.maxSelections = data.maxSelections;
  if (data.videoPolicy !== undefined) update.videoPolicy = data.videoPolicy;
  if (data.videoProviders !== undefined) update.videoProviders = data.videoProviders;
  if (data.maxVideoDurationSec !== undefined) update.maxVideoDurationSec = data.maxVideoDurationSec;
  if (data.maxVideoSizeMb !== undefined) update.maxVideoSizeMb = data.maxVideoSizeMb;
  if (data.allowTeam !== undefined) update.allowTeam = data.allowTeam;
  if (data.maxTeamSize !== undefined) update.maxTeamSize = data.maxTeamSize;
  if (data.customQuestions !== undefined) update.customQuestions = JSON.stringify(data.customQuestions);
  if (data.announceMode !== undefined) update.announceMode = data.announceMode;
  if (data.requireApproval !== undefined) update.requireApproval = data.requireApproval;
  if (data.askName !== undefined) update.askName = data.askName;
  if (data.askGradeClass !== undefined) update.askGradeClass = data.askGradeClass;
  if (data.askStudentNumber !== undefined) update.askStudentNumber = data.askStudentNumber;
  if (data.askContact !== undefined) update.askContact = data.askContact;

  const board = await db.board.update({
    where: { id: boardId },
    data: update,
  });
  return NextResponse.json({ ok: true, board });
}
