/**
 * POST /api/event/lookup  { boardId, name, number }
 *
 * PUBLIC. For announceMode === "private-search" only. Returns { status }
 * without exposing any other applicant data.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lookupPayloadSchema } from "@/lib/event/schemas";
import { statusToLookup } from "@/lib/event/announce";

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = lookupPayloadSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  const { boardId, name, number } = parsed.data;

  const board = await db.board.findUnique({
    where: { id: boardId },
    select: { id: true, announceMode: true, layout: true },
  });
  if (!board || board.layout !== "event-signup") return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (board.announceMode !== "private-search") {
    return NextResponse.json({ error: "not_allowed" }, { status: 400 });
  }
  const submission = await db.submission.findFirst({
    where: {
      boardId,
      applicantName: name,
      applicantNumber: number,
    },
    select: { status: true },
  });
  return NextResponse.json({ ok: true, ...statusToLookup(submission) });
}
