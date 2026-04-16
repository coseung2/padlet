import { NextResponse } from "next/server";

// parent-class-invite-v2 Path A — v1 endpoint deprecated.
// ParentInviteCode is no longer the unit of record — codes are classroom-scoped.

export async function DELETE() {
  return NextResponse.json({ error: "gone" }, { status: 410 });
}
