"use client";

/**
 * useIframeBudget — global LRU-3 store for active Canva iframes.
 *
 * Why module-level instead of React Context?
 *   - Cross-component global state where any card on the board can evict any
 *     other card is exactly the shape useSyncExternalStore was designed for.
 *   - Avoids re-rendering the entire board subtree when the active set
 *     changes; only subscribed cards re-render.
 *   - Zero dependencies: no zustand/jotai needed for this scope.
 *
 * Why LRU-3?
 *   - Roadmap budget (tablet-performance-roadmap.md §6) targets Galaxy Tab
 *     S6 Lite (4 GB RAM). Three simultaneous Canva iframes (~60 MB each
 *     steady-state) plus the main renderer stay under the ~500 MB budget
 *     Chrome Android enforces before it kills the tab.
 *
 * Eviction policy:
 *   - `activate(id)` pushes `id` to the end of the queue. If queue length
 *     exceeds MAX_ACTIVE, the head (least-recently activated) is shifted
 *     off and its subscribers re-render with `isActive === false`, which
 *     triggers iframe unmount and thumbnail fallback.
 *   - `deactivate(id)` removes `id` from the queue (no-op if absent).
 *   - `getEvictionEvent()` returns the id most recently evicted *by LRU
 *     overflow* so UIs can show a brief "썸네일로 돌아감" toast.
 */

import { useSyncExternalStore } from "react";

export const MAX_ACTIVE = 3;

type Listener = () => void;

type State = {
  // Ordered from least-recently activated (index 0) to most recent (last).
  active: readonly string[];
  // Last id evicted by LRU overflow, with a monotonically increasing seq
  // so UIs subscribed via selectors can detect "a new eviction happened"
  // even when the same id is evicted twice in a row.
  lastEviction: { id: string; seq: number } | null;
};

let state: State = { active: [], lastEviction: null };
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): State {
  return state;
}

// Server-rendered snapshot: no active iframes. Safe for SSR/RSC boundaries.
function getServerSnapshot(): State {
  return { active: [], lastEviction: null };
}

export function activate(id: string): void {
  const without = state.active.filter((x) => x !== id);
  let next = [...without, id];
  let eviction = state.lastEviction;
  if (next.length > MAX_ACTIVE) {
    const overflow = next.length - MAX_ACTIVE;
    const evicted = next.slice(0, overflow);
    next = next.slice(overflow);
    // Record the most recent eviction for toast feedback.
    const seq = (state.lastEviction?.seq ?? 0) + 1;
    eviction = { id: evicted[evicted.length - 1]!, seq };
  }
  state = { active: next, lastEviction: eviction };
  emit();
}

export function deactivate(id: string): void {
  if (!state.active.includes(id)) return;
  state = { ...state, active: state.active.filter((x) => x !== id) };
  emit();
}

export function isActive(id: string): boolean {
  return state.active.includes(id);
}

// -- Hook surface ------------------------------------------------------------

export function useIsActive(id: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => state.active.includes(id),
    () => false,
  );
}

export function useLastEviction(): State["lastEviction"] {
  return useSyncExternalStore(subscribe, () => state.lastEviction, () => null);
}

/**
 * Convenience hook exposing the action trio + reactive isActive flag for a
 * single id. Returned action identities are stable (module-level).
 */
export function useIframeBudget(id: string) {
  const active = useIsActive(id);
  return { active, activate, deactivate };
}

// -- Test helpers (not exported from barrel) --------------------------------

/** @internal Reset store between tests. Do not call in production code. */
export function __resetForTests(): void {
  state = { active: [], lastEviction: null };
  listeners.clear();
}

/** @internal Inspect current active list in tests. */
export function __getActiveForTests(): readonly string[] {
  return state.active;
}
