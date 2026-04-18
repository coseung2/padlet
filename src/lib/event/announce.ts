/**
 * Announce mode DTO masking (ES-10).
 *
 * Controls what fields are returned on the public /result page depending on
 * board.announceMode. Private channels (email/contact) are NEVER returned via
 * public endpoints.
 */
import type { Submission } from "@prisma/client";

export type PublicResultRow = {
  id: string;
  name: string | null;
  grade: number | null;
  class: number | null;
  // Explicitly excluded: contact, number (for public-list). `number` is shown
  // only in teacher views or private-search match.
};

export function toPublicListRow(s: Pick<Submission, "id" | "applicantName" | "applicantGrade" | "applicantClass">): PublicResultRow {
  return {
    id: s.id,
    name: s.applicantName ?? null,
    grade: s.applicantGrade ?? null,
    class: s.applicantClass ?? null,
  };
}

export type LookupResult =
  | { status: "accepted" }
  | { status: "rejected" }
  | { status: "pending" }
  | { status: "not_found" };

export function statusToLookup(s: { status: string } | null): LookupResult {
  if (!s) return { status: "not_found" };
  if (s.status === "approved") return { status: "accepted" };
  if (s.status === "rejected") return { status: "rejected" };
  return { status: "pending" };
}
