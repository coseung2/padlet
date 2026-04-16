import "server-only";
import { NextResponse } from "next/server";
import { getCurrentParent } from "./parent-session";

// parent-class-invite-v2 — parentAuthOnlyMiddleware.
//
// Applies to /api/parent/signup, /api/parent/match/*, /api/parent/session/status.
// Verifies that a parent_session cookie exists + is still valid (session row
// not revoked, not expired, parent not soft-deleted). Does NOT require an
// active ParentChildLink — this is the key distinction from parentScopeMiddleware.
//
// See src/lib/parent-scope.ts for the active-only variant used by
// /api/parent/children/*.

export class ParentAuthOnlyError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
    this.name = "ParentAuthOnlyError";
  }
}

export async function requireParentAuth(_req: Request) {
  const current = await getCurrentParent();
  if (!current) {
    throw new ParentAuthOnlyError(401, "no_session");
  }
  return current;
}

export async function withParentAuth<T>(
  req: Request,
  fn: (ctx: Awaited<ReturnType<typeof requireParentAuth>>) => Promise<T>
): Promise<T | NextResponse> {
  try {
    const ctx = await requireParentAuth(req);
    return await fn(ctx);
  } catch (e) {
    if (e instanceof ParentAuthOnlyError) {
      return NextResponse.json({ error: e.code }, { status: e.status });
    }
    console.error("[withParentAuth] unhandled", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
