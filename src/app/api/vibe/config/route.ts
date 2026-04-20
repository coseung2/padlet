// Vibe-arcade config API (Seed 13, AC-F1).
// GET: board member reads config. PATCH: owner/editor updates (teacher-only fields).

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getBoardRole } from "@/lib/rbac";
import { VibeArcadeConfigPatchSchema } from "@/lib/vibe-arcade/types";

function boardIdFromReq(req: Request): string | null {
  const url = new URL(req.url);
  return url.searchParams.get("boardId");
}

async function ensureConfig(boardId: string) {
  const existing = await db.vibeArcadeConfig.findUnique({ where: { boardId } });
  if (existing) return existing;
  return db.vibeArcadeConfig.create({ data: { boardId } });
}

export async function GET(req: Request) {
  const boardId = boardIdFromReq(req);
  if (!boardId) return NextResponse.json({ error: "boardId required" }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const board = await db.board.findUnique({ where: { id: boardId } });
  if (!board) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const role = await getBoardRole(boardId, user.id);
  if (!role) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const cfg = await ensureConfig(boardId);
  return NextResponse.json(cfg);
}

export async function PATCH(req: Request) {
  const boardId = boardIdFromReq(req);
  if (!boardId) return NextResponse.json({ error: "boardId required" }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const board = await db.board.findUnique({ where: { id: boardId } });
  if (!board) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const role = await getBoardRole(boardId, user.id);
  if (role !== "owner" && role !== "editor") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = VibeArcadeConfigPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", issues: parsed.error.issues }, { status: 400 });
  }

  await ensureConfig(boardId);
  const updated = await db.vibeArcadeConfig.update({
    where: { boardId },
    data: parsed.data,
  });
  return NextResponse.json(updated);
}
