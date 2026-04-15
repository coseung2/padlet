/**
 * Request-scoped identity resolver. One call per server component /
 * API handler — returns a normalised Identity object that
 * src/lib/card-permissions.ts predicates consume.
 *
 * Resolution precedence: NextAuth teacher → student_session → parent
 * session → anonymous. The first successful resolver wins; the
 * remaining branches are skipped to avoid unnecessary DB work.
 */
import "server-only";
import { db } from "./db";
import { getCurrentUser } from "./auth";
import { getCurrentStudent } from "./student-auth";
import { getCurrentParent } from "./parent-session";
import type { Identity } from "./card-permissions";

/**
 * Resolve the caller's identity.
 *
 * `strict=true` (default) makes resolveIdentity fall through to `{ kind:
 * "anon" }` when no credential is present. Callers that require a
 * specific identity should still re-check with their existing guards —
 * this resolver is a unifier, not an authoriser.
 */
export async function resolveIdentity(): Promise<Identity> {
  // 1. NextAuth teacher path. getCurrentUser falls back to a dev-mock
  //    user when the `as` cookie is set, which is fine — those mock
  //    users are real User rows, and we compute ownsBoardIds from
  //    BoardMember.role="owner" so a mock editor/viewer still ends up
  //    with an empty set (i.e. read-only teacher).
  const user = await safeCurrentUser();
  if (user) {
    const owned = await db.boardMember.findMany({
      where: { userId: user.id, role: "owner" },
      select: { boardId: true },
    });
    const ownsBoardIds = new Set(owned.map((m) => m.boardId));
    return {
      kind: "teacher",
      userId: user.id,
      name: user.name,
      ownsBoardIds,
    };
  }

  // 2. Student HMAC cookie.
  const student = await getCurrentStudent();
  if (student) {
    return {
      kind: "student",
      studentId: student.id,
      name: student.name,
      classroomId: student.classroomId,
    };
  }

  // 3. Parent session. getCurrentParent returns null when absent.
  //    Parents only reach board data via /parent/* UI which has its own
  //    guards; resolveIdentity is informational here.
  const parentCtx = await getCurrentParent();
  if (parentCtx?.parent) {
    const links = await db.parentChildLink.findMany({
      where: {
        parentId: parentCtx.parent.id,
        status: "active",
        deletedAt: null,
      },
      select: { studentId: true },
    });
    return {
      kind: "parent",
      parentId: parentCtx.parent.id,
      childStudentIds: new Set(links.map((l) => l.studentId)),
    };
  }

  return { kind: "anon" };
}

/** getCurrentUser throws Unauthenticated in prod when missing session.
 *  Catch and convert to null for identity-resolution path. */
async function safeCurrentUser() {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}
