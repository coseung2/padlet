import "server-only";
import { randomBytes } from "crypto";

// parent-class-invite-v2 — in-memory match ticket.
//
// Binds (parentSessionId, classroomId) for 5 minutes after a successful
// /api/parent/match/code call. Consumed by /api/parent/match/students (read)
// and /api/parent/match/request (consume).
//
// Single-instance; sticky-route naturally because Vercel Functions (icn1)
// run parent requests on a shared pool. If multi-region is added later,
// migrate to a small key-value store (see architecture.md §5.1 note).

const TTL_MS = 5 * 60 * 1000;

type Ticket = {
  parentSessionId: string;
  classroomId: string;
  classroomName: string;
  expiresAt: number;
};

const tickets = new Map<string, Ticket>();

function gc(): void {
  const now = Date.now();
  for (const [id, t] of tickets) {
    if (t.expiresAt <= now) tickets.delete(id);
  }
}

export function issueTicket(params: {
  parentSessionId: string;
  classroomId: string;
  classroomName: string;
}): string {
  gc();
  const ticket = randomBytes(24).toString("base64url");
  tickets.set(ticket, {
    parentSessionId: params.parentSessionId,
    classroomId: params.classroomId,
    classroomName: params.classroomName,
    expiresAt: Date.now() + TTL_MS,
  });
  return ticket;
}

export function readTicket(ticket: string, parentSessionId: string): Ticket | null {
  gc();
  const t = tickets.get(ticket);
  if (!t) return null;
  if (t.parentSessionId !== parentSessionId) return null;
  if (t.expiresAt <= Date.now()) {
    tickets.delete(ticket);
    return null;
  }
  return t;
}

export function consumeTicket(ticket: string, parentSessionId: string): Ticket | null {
  const t = readTicket(ticket, parentSessionId);
  if (!t) return null;
  tickets.delete(ticket);
  return t;
}

// Test-only hook.
export function _resetTicketsForTests(): void {
  tickets.clear();
}
