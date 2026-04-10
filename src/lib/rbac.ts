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
