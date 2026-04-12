/**
 * Realtime channel key helpers.
 *
 * NOTE (Breakout T0-①): This module only defines *channel key strings* that
 * the UI and server routes can agree on. The actual pub/sub engine (Supabase
 * Realtime, PartyKit, Pusher, …) has not been chosen yet — that decision is
 * deferred to a separate research task (`research/realtime-engine`).
 *
 * By keeping the channel naming convention here, any future engine swap only
 * needs to rewire the transport layer; call sites that use these helpers
 * remain stable.
 *
 *   board  → `board:{boardId}`                (all events for the whole board)
 *   section→ `board:{boardId}:section:{sectionId}`  (breakout-scoped events)
 *
 * Consumers MUST NOT construct channel names by hand. Use these helpers so
 * the format stays canonical and greppable.
 */

export function boardChannelKey(boardId: string): string {
  if (!boardId) throw new Error("boardChannelKey: boardId required");
  return `board:${boardId}`;
}

export function sectionChannelKey(boardId: string, sectionId: string): string {
  if (!boardId) throw new Error("sectionChannelKey: boardId required");
  if (!sectionId) throw new Error("sectionChannelKey: sectionId required");
  return `board:${boardId}:section:${sectionId}`;
}

/**
 * Placeholder publish/subscribe. Intentionally a no-op.
 * When the realtime engine is chosen, replace the body of this module while
 * keeping the signatures so callers (if added) won't need updates.
 */
export type RealtimeEvent = {
  channel: string;
  type: string;
  payload: unknown;
};

export async function publish(_event: RealtimeEvent): Promise<void> {
  // no-op until a realtime engine is adopted
}
