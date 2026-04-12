/**
 * Role-Based Access Control for boards.
 *
 * Roles: owner | editor | viewer
 *   - owner  : full control (including delete any card)
 *   - editor : read + create/update cards; may delete own cards
 *   - viewer : read-only
 *
 * Author-based exception for delete is handled in the API route, not here.
 */
import { db } from "./db";

export type Role = "owner" | "editor" | "viewer";
export type Action = "view" | "edit" | "delete_any";

const PERMISSIONS: Record<Action, readonly Role[]> = {
  view: ["owner", "editor", "viewer"],
  edit: ["owner", "editor"],
  delete_any: ["owner"],
};

export class ForbiddenError extends Error {
  status = 403;
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

function isRole(x: string): x is Role {
  return x === "owner" || x === "editor" || x === "viewer";
}

export async function getBoardRole(
  boardId: string,
  userId: string
): Promise<Role | null> {
  const member = await db.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId } },
  });
  if (!member) return null;
  return isRole(member.role) ? member.role : null;
}

export async function requirePermission(
  boardId: string,
  userId: string,
  action: Action
): Promise<Role> {
  const role = await getBoardRole(boardId, userId);
  if (!role) {
    throw new ForbiddenError(`Not a member of board ${boardId}`);
  }
  if (!PERMISSIONS[action].includes(role)) {
    throw new ForbiddenError(`Role "${role}" cannot "${action}" on this board`);
  }
  return role;
}

// ─── Breakout (T0-①) ──────────────────────────────────────────────────────
//
// viewSection decides whether a caller may read a section-scoped Breakout view.
// It is additive — existing board-level checks (requirePermission) are
// unaffected. The caller may be:
//   - a NextAuth user (`userId` provided): must be a board member, OR
//   - a Student (see classroomStudentId): must belong to the board's classroom, OR
//   - anonymous with a matching share token: `section.accessToken === token`
//
// Rules:
//   1. Section must exist (else NotFound — caller handles via `section == null`).
//   2. If `token` provided and matches section.accessToken → allow.
//   3. If NextAuth user is a board member → allow.
//   4. If student is in the same classroom as the board → allow.
//   5. Else → ForbiddenError.
//
// Returns the resolved Section so the caller doesn't re-query.

export type SectionViewContext = {
  userId?: string | null;
  classroomStudentId?: string | null; // Student.id
  studentClassroomId?: string | null; // Student.classroomId
  token?: string | null;
};

export type SectionForView = {
  id: string;
  boardId: string;
  title: string;
  order: number;
  accessToken: string | null;
};

export async function viewSection(
  sectionId: string,
  ctx: SectionViewContext
): Promise<SectionForView> {
  const section = await db.section.findUnique({ where: { id: sectionId } });
  if (!section) {
    // 404-style: surface as forbidden to avoid existence enumeration.
    throw new ForbiddenError(`Section ${sectionId} not found or not visible`);
  }

  // 2. token path
  if (ctx.token && section.accessToken && ctx.token === section.accessToken) {
    return section;
  }

  // 3. NextAuth user path
  if (ctx.userId) {
    const role = await getBoardRole(section.boardId, ctx.userId);
    if (role) return section;
  }

  // 4. Student classroom path
  if (ctx.studentClassroomId) {
    const board = await db.board.findUnique({
      where: { id: section.boardId },
      select: { classroomId: true },
    });
    if (board?.classroomId && board.classroomId === ctx.studentClassroomId) {
      return section;
    }
  }

  throw new ForbiddenError("Cannot view this section");
}
