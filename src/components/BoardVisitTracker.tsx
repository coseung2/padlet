"use client";

import { useEffect } from "react";

/**
 * BoardVisitTracker — writes the current timestamp to
 * `lastVisitedBoards[boardId]` in localStorage whenever the board page
 * is viewed. Powers the "새 활동" badge on the classroom detail page.
 *
 * No UI, no dependencies beyond React.
 */
export function BoardVisitTracker({ boardId }: { boardId: string }) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem("lastVisitedBoards");
      const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      map[boardId] = new Date().toISOString();
      localStorage.setItem("lastVisitedBoards", JSON.stringify(map));
    } catch {
      /* storage unavailable (private mode, quota) — silently skip */
    }
  }, [boardId]);

  return null;
}
