import { NextResponse } from "next/server";

// parent-class-invite-v2 Path A — v1 endpoint deprecated.
// Replaced by POST /api/parent/match/code (+ match/students + match/request).
// See architecture.md §2.3.

export async function POST() {
  return NextResponse.json(
    { error: "gone", replacedBy: "/api/parent/match/code" },
    { status: 410 }
  );
}
