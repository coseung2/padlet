// parent-class-invite-v2 — ParentChildLink status transition validator.
//
// pending  → active            (teacher approve)
// pending  → rejected          (teacher reject | code_rotated | auto_expired | classroom_deleted system transitions)
// active   → revoked           (teacher_revoked | classroom_deleted | year_end | parent_self_leave)
// rejected → dead-end
// revoked  → dead-end
//
// Violating a transition → 409 STATE_CONFLICT in API layer.

import type { ParentLinkStatus } from "@prisma/client";

export const ALLOWED_TRANSITIONS: Record<ParentLinkStatus, ParentLinkStatus[]> = {
  pending: ["active", "rejected"],
  active: ["revoked"],
  rejected: [],
  revoked: [],
};

export function canTransition(from: ParentLinkStatus, to: ParentLinkStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: ParentLinkStatus, to: ParentLinkStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`invalid_transition:${from}->${to}`);
  }
}
