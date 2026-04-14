/**
 * POST /api/external/student-logout
 *
 * Student logout for the Canva App panel. Mirrors /api/student/logout but
 * lives under /api/external/* so the CORS rule in next.config.ts
 * (Access-Control-Allow-Origin = canva-apps.com + credentials) applies —
 * /api/student/logout is same-origin only and would be blocked from an
 * iframe.
 */
import { NextResponse } from "next/server";
import { clearStudentSession } from "@/lib/student-auth";

export const runtime = "nodejs";

export async function POST() {
  await clearStudentSession();
  return NextResponse.json({ ok: true }, { status: 200 });
}
