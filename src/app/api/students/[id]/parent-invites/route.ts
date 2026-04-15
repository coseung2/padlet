import { NextResponse } from "next/server";

// parent-class-invite-v2 Path A — v1 endpoint deprecated.
// Replaced by classroom-scoped POST /api/class-invite-codes.

export async function POST() {
  return NextResponse.json(
    { error: "gone", replacedBy: "/api/class-invite-codes" },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: "gone", replacedBy: "/api/class-invite-codes" },
    { status: 410 }
  );
}
