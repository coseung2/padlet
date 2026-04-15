/**
 * Role-Based Access Control for boards.
 *
 * Roles: owner | editor | viewer
 *   - owner  : full control (including delete any card)
 *   - editor : read + create/update cards; may delete own cards
 *   - viewer : read-only
 *
 * Author-based exception for delete is handled in the API route, not here.
 *
 * @deprecated card-level permissions moved to src/lib/card-permissions.ts
 * (Identity × ownership matrix). The Role enum + requirePermission remain
 * for teacher-only routes (boards, breakout, event-signup, sections) that
 * haven't migrated yet. Do NOT add new callers; prefer resolveIdentity +
 * the pure predicates in card-permissions.ts.
 */
import { timingSafeEqual } from "crypto";
import { db } from "./db";

/** @deprecated see module header. */
export type Role = "owner" | "editor" | "viewer";
/** @deprecated see module header. */
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

  // 2. token path — constant-time compare to avoid leaking token length via
  // timing side-channels. Short-circuit on null/empty values.
  if (ctx.token && section.accessToken && tokensEqual(ctx.token, section.accessToken)) {
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

function tokensEqual(a: string, b: string): boolean {
  // Buffer compare is length-sensitive; if lengths differ we bail early (a
  // legitimate rotated token of the same length is the common case).
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// ─── Breakout visibility gating (BR-6) ────────────────────────────────────
//
// Once a board has layout="breakout", `viewSection` alone is not enough —
// the own-only / peek-others visibility mode also constrains which sections
// a student may read. Teachers (owner/editor) always have full access.
//
// Rules (student):
//   - own-only  → may only see:
//       · their BreakoutMembership.sectionId (or sections within their
//         group — we keep it per-section for now since each group may
//         contain multiple sections, see `groupSectionTitle`)
//       · teacher-pool sections (shared titles)
//   - peek-others → all group + teacher-pool sections
//
// Caller is expected to have already passed `viewSection` (i.e. classroom
// membership or share token matched). `assertBreakoutVisibility` narrows
// the access further when the section belongs to a breakout board.

export type BreakoutVisibilityMode = "own-only" | "peek-others";

export type BreakoutAccessInput = {
  sectionId: string;
  boardId: string;
  userId?: string | null;
  studentId?: string | null;
  token?: string | null;
};

/**
 * If the section belongs to a breakout board, apply the visibility override
 * (or the template's recommendedVisibility). Throws ForbiddenError when a
 * student would be leaking into another group's section.
 *
 * Teacher (board owner/editor) and matched shareToken callers are exempt —
 * they already satisfied `viewSection`'s stronger checks.
 */
export async function assertBreakoutVisibility(
  input: BreakoutAccessInput
): Promise<void> {
  const assignment = await db.breakoutAssignment.findUnique({
    where: { boardId: input.boardId },
    include: { template: true },
  });
  if (!assignment) return; // not a breakout board → no extra gating

  // Teacher path — owner/editor on the board is always allowed.
  if (input.userId) {
    const role = await getBoardRole(input.boardId, input.userId);
    if (role === "owner" || role === "editor") return;
  }

  // Shared-token path: if the caller presented the section's accessToken,
  // `viewSection` already validated it. Allow through.
  if (input.token) {
    const sec = await db.section.findUnique({
      where: { id: input.sectionId },
      select: { accessToken: true },
    });
    if (sec?.accessToken && tokensEqual(input.token, sec.accessToken)) return;
  }

  // Anyone else must be a student with either teacher-pool access or a
  // membership matching this section (own-only) or any group section
  // (peek-others).
  if (!input.studentId) {
    throw new ForbiddenError("Breakout: student identity required");
  }

  const visibility: BreakoutVisibilityMode =
    (assignment.visibilityOverride as BreakoutVisibilityMode | null) ??
    (assignment.template.recommendedVisibility as BreakoutVisibilityMode);

  // Parse the template.structure for shared section titles once.
  // `structure` is JSON; we accept any shape failure silently (falls through
  // to the membership check).
  const sharedTitles = new Set<string>();
  const raw = assignment.template.structure as {
    sharedSections?: Array<{ title: string }>;
  } | null;
  if (raw?.sharedSections) {
    for (const s of raw.sharedSections) sharedTitles.add(s.title);
  }

  const section = await db.section.findUnique({
    where: { id: input.sectionId },
    select: { title: true },
  });
  if (section && sharedTitles.has(section.title)) return; // teacher-pool OK for everyone

  if (visibility === "peek-others") {
    // Any section in this assignment's board is OK (the earlier viewSection
    // already verified the section belongs to the board).
    return;
  }

  // own-only: must have a membership in THIS specific section.
  const membership = await db.breakoutMembership.findFirst({
    where: {
      assignmentId: assignment.id,
      studentId: input.studentId,
      sectionId: input.sectionId,
    },
    select: { id: true },
  });
  if (!membership) {
    throw new ForbiddenError("Breakout: own-only section gating");
  }
}

/**
 * Auto-join a student to a breakout section when the assignment's
 * deployMode === "link-fixed". Idempotent (respects @@unique).
 *
 * Returns `{ ok: true }` on success or when already a member, else a reason
 * the caller can surface to the user.
 */
export async function maybeAutoJoinLinkFixed(params: {
  assignmentId: string;
  sectionId: string;
  studentId: string;
}): Promise<
  | { ok: true }
  | { ok: false; reason: "capacity_reached" | "already_in_other" | "not_link_fixed" }
> {
  const assignment = await db.breakoutAssignment.findUnique({
    where: { id: params.assignmentId },
  });
  if (!assignment) return { ok: false, reason: "not_link_fixed" };
  if (assignment.deployMode !== "link-fixed") {
    return { ok: false, reason: "not_link_fixed" };
  }

  // Already a member of THIS section?
  const existing = await db.breakoutMembership.findFirst({
    where: {
      assignmentId: assignment.id,
      studentId: params.studentId,
    },
  });
  if (existing) {
    if (existing.sectionId === params.sectionId) return { ok: true };
    return { ok: false, reason: "already_in_other" };
  }

  // Capacity gate — soft limit but we enforce hard here for link-fixed to
  // avoid wild oversubscription. Teacher can PATCH capacity if needed.
  const count = await db.breakoutMembership.count({
    where: { assignmentId: assignment.id, sectionId: params.sectionId },
  });
  if (count >= assignment.groupCapacity) {
    return { ok: false, reason: "capacity_reached" };
  }

  try {
    await db.breakoutMembership.create({
      data: {
        assignmentId: assignment.id,
        sectionId: params.sectionId,
        studentId: params.studentId,
      },
    });
  } catch {
    // race with another tab / unique violation — treat as success idempotent
    return { ok: true };
  }
  return { ok: true };
}
