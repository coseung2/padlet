/**
 * POST /api/event/rotate-token  { boardId }
 *
 * Teacher-only. Generates a new Board.accessToken, invalidating previous QR
 * links immediately (ES-4, AC4). Requires board edit permission.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { issueToken } from "@/lib/event/tokens";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const boardId = (body as { boardId?: unknown })?.boardId;
  if (typeof boardId !== "string" || !boardId) {
    return NextResponse.json({ error: "boardId_required" }, { status: 400 });
  }
  try {
    await requirePermission(boardId, user.id, "edit");
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw e;
  }
  const token = issueToken();
  const board = await db.board.update({
    where: { id: boardId },
    data: { accessToken: token, accessMode: "public-link" },
    select: { id: true, accessToken: true, accessMode: true, slug: true },
  });
  return NextResponse.json({ ok: true, board });
}
