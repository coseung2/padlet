import "server-only";
import { NextResponse } from "next/server";
import { db } from "./db";
import { getCurrentParent } from "./parent-session";

// parentScopeMiddleware — the one-stop guard for every /api/parent/* endpoint.
//
// Three layered checks:
//   1. requireParentScope(req)               → session is valid + parent alive
//   2. requireParentScopeForStudent(req, id) → (1) + studentId ∈ parent.children
//   3. loadParentChildren(parent)            → returns active child links
//
// Error policy:
//   - Missing / revoked / expired session           → 401
//   - Parent.parentDeletedAt set                    → 401
//   - studentId not linked to this parent           → 403 (explicitly flagged
//     for the cross-student API boundary — see AC-5 "parent A token on
//     student B's API → 403")
//   - Attempt to look up by ParentChildLink.id that belongs to another parent
//     (via requireParentChildLinkOwned) → 404 (existence non-disclosure,
//     AC-6 "parentA on parentB's link → 404")
//
// The cross-parent isolation 404 vs cross-student 403 asymmetry is deliberate.
// A parent legitimately might not know another parent exists, so the link-id
// boundary must not distinguish "no such link" from "belongs to someone
// else"; but when the parent's own child's content (studentId-indexed) is
// probed for a DIFFERENT sibling, that's a known request shape, so 403 is
// the correct semantic.

export type ParentContext = Awaited<ReturnType<typeof requireParentScope>>;

export class ParentScopeError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
    this.name = "ParentScopeError";
  }
}

/**
 * Resolve the current parent from cookie. Throws ParentScopeError(401) if
 * unauthenticated. On success, returns the Parent row + its active
 * ParentSession + the list of active child studentIds (sorted by createdAt).
 */
export async function requireParentScope(_req: Request) {
  const current = await getCurrentParent();
  if (!current) {
    throw new ParentScopeError(401, "unauthorized");
  }
  // v2 narrowing: only `status='active'` grants read access. pending /
  // rejected / revoked rows can share `deletedAt IS NULL` in some flows
  // (pending requests kept for 7d, rejected-not-yet-cleaned) so the
  // previous deletedAt-only filter would leak data to parents whose
  // approval hasn't completed.
  const links = await db.parentChildLink.findMany({
    where: {
      parentId: current.parent.id,
      status: "active",
      deletedAt: null,
    },
    select: { id: true, studentId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const childIds = new Set(links.map((l) => l.studentId));
  return {
    parent: current.parent,
    session: current.session,
    childIds,
    childLinks: links,
  };
}

/**
 * Same as requireParentScope but also verifies the caller's children include
 * the given studentId. Throws ParentScopeError(403) when not linked.
 */
export async function requireParentScopeForStudent(req: Request, studentId: string) {
  const ctx = await requireParentScope(req);
  if (!ctx.childIds.has(studentId)) {
    throw new ParentScopeError(403, "forbidden_student");
  }
  return ctx;
}

/**
 * Look up a ParentChildLink by id and confirm it belongs to the caller.
 * Returns 404 for both "not found" and "belongs to another parent" — this
 * prevents enumeration of link ids across parents (AC-6).
 */
export async function requireParentChildLinkOwned(req: Request, linkId: string) {
  const ctx = await requireParentScope(req);
  const link = await db.parentChildLink.findFirst({
    where: { id: linkId, parentId: ctx.parent.id },
    include: { student: true },
  });
  if (!link) {
    throw new ParentScopeError(404, "not_found");
  }
  return { ctx, link };
}

/**
 * Route-handler wrapper that catches ParentScopeError and returns the
 * appropriate JSON response. Pattern:
 *
 *   export const GET = (req: Request) => withParentScope(req, async (ctx) => {
 *     return NextResponse.json({ children: Array.from(ctx.childIds) });
 *   });
 */
export async function withParentScope<T>(
  req: Request,
  fn: (ctx: ParentContext) => Promise<T>
): Promise<T | NextResponse> {
  try {
    const ctx = await requireParentScope(req);
    return await fn(ctx);
  } catch (e) {
    if (e instanceof ParentScopeError) {
      return NextResponse.json({ error: e.code }, { status: e.status });
    }
    console.error("[withParentScope] unhandled", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

/**
 * Sugar: same as withParentScope but also checks studentId linkage.
 */
export async function withParentScopeForStudent<T>(
  req: Request,
  studentId: string,
  fn: (ctx: ParentContext) => Promise<T>
): Promise<T | NextResponse> {
  try {
    const ctx = await requireParentScopeForStudent(req, studentId);
    return await fn(ctx);
  } catch (e) {
    if (e instanceof ParentScopeError) {
      return NextResponse.json({ error: e.code }, { status: e.status });
    }
    console.error("[withParentScopeForStudent] unhandled", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
