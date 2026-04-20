// Vibe-arcade hard delete sweep (Seed 13, AC-G5).
// Free 120일 / Pro 365일. 현재 구현은 보수적으로 Pro (365d)만 적용.
// TODO(phase7-followup): classroom.plan 기반 분기 + 실제 DELETE.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HARD_DELETE_MS = 365 * 24 * 60 * 60 * 1000;

function authorizeCron(req: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (req.headers.get("x-vercel-cron")) return true;
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  return Boolean(secret && process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
}

export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const threshold = new Date(Date.now() - HARD_DELETE_MS);
  const { count } = await db.vibeSession.deleteMany({
    where: { startedAt: { lt: threshold } },
  });

  return NextResponse.json({ ok: true, threshold: threshold.toISOString(), deleted: count });
}
