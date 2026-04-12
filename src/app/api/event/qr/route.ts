/**
 * POST /api/event/qr  { boardId }
 *
 * Teacher-only. Returns an SVG string for the current signup URL including the
 * accessToken. Callers typically call /rotate-token first if they want a fresh
 * token; this endpoint just renders.
 */
import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission, ForbiddenError } from "@/lib/rbac";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const boardId = (raw as { boardId?: unknown })?.boardId;
  if (typeof boardId !== "string") return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    await requirePermission(boardId, user.id, "edit");
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw e;
  }
  const board = await db.board.findUnique({
    where: { id: boardId },
    select: { slug: true, accessToken: true, accessMode: true },
  });
  if (!board) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (board.accessMode !== "public-link" || !board.accessToken) {
    return NextResponse.json({ error: "not_public" }, { status: 400 });
  }
  const origin = req.headers.get("origin") || "";
  const url = `${origin}/b/${board.slug}?t=${board.accessToken}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 256 });
  return NextResponse.json({ ok: true, url, svg });
}
