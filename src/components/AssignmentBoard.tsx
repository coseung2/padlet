"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AssignmentSlotDTO, AssignmentBoardDTO } from "@/types/assignment";
import { AssignmentGridView } from "./assignment/AssignmentGridView";
import { AssignmentFullscreenModal } from "./assignment/AssignmentFullscreenModal";
import { AssignmentStudentView } from "./assignment/AssignmentStudentView";

type Props = {
  viewer: "teacher" | "student";
  // AC-13: "matrix" renders the same AssignmentGridView inside a
  // `.assign-board--matrix` wrapper (1-column placeholder CSS). Default grid
  // is unchanged. Guard enforced server-side in `/board/[id]/page.tsx`.
  view?: "grid" | "matrix";
  board: AssignmentBoardDTO;
  initialSlots: AssignmentSlotDTO[];
  canStudentSubmit?: boolean;
};

/**
 * AB-1 assignment-board container. Rewritten from the Submission+BoardMember
 * flow to use AssignmentSlot. Same file path so `src/app/board/[id]/page.tsx`
 * import stays stable.
 */
export function AssignmentBoard({ viewer, view, board, initialSlots, canStudentSubmit }: Props) {
  const router = useRouter();
  const [slots, setSlots] = useState<AssignmentSlotDTO[]>(initialSlots);
  const [openSlotId, setOpenSlotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orderedSlots = useMemo(
    () => [...slots].sort((a, b) => a.slotNumber - b.slotNumber),
    [slots]
  );
  const openIndex = openSlotId
    ? orderedSlots.findIndex((s) => s.id === openSlotId)
    : -1;
  const openSlot = openIndex >= 0 ? orderedSlots[openIndex] : null;

  const patchLocal = useCallback((next: AssignmentSlotDTO) => {
    setSlots((prev) => prev.map((s) => (s.id === next.id ? next : s)));
  }, []);

  const openSlotAndStampView = useCallback(
    async (slot: AssignmentSlotDTO) => {
      setOpenSlotId(slot.id);
      // Auto-stamp viewedAt for submitted/returned/reviewed/viewed. Ignored
      // errors — the grid is still fine and a refresh will reconcile.
      if (slot.submissionStatus === "assigned" || slot.submissionStatus === "orphaned") return;
      try {
        const res = await fetch(`/api/assignment-slots/${slot.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ transition: "open" }),
        });
        if (res.ok) {
          const { slot: next } = (await res.json()) as { slot: AssignmentSlotDTO };
          patchLocal(next);
        }
      } catch {
        /* ignore */
      }
    },
    [patchLocal]
  );

  const navigateBy = useCallback(
    (delta: number) => {
      if (openIndex < 0) return;
      const target = orderedSlots[openIndex + delta];
      if (!target) return;
      void openSlotAndStampView(target);
    },
    [openIndex, orderedSlots, openSlotAndStampView]
  );

  const handleReturn = useCallback(
    async (reason: string) => {
      if (!openSlot) return;
      setError(null);
      const res = await fetch(`/api/assignment-slots/${openSlot.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transition: "return", returnReason: reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? "return_failed");
        throw new Error(body?.error ?? "return_failed");
      }
      const { slot: next } = (await res.json()) as { slot: AssignmentSlotDTO };
      patchLocal(next);
      router.refresh();
    },
    [openSlot, patchLocal, router]
  );

  const handleReview = useCallback(async () => {
    if (!openSlot) return;
    setError(null);
    const res = await fetch(`/api/assignment-slots/${openSlot.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transition: "review" }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? "review_failed");
      throw new Error(body?.error ?? "review_failed");
    }
    const { slot: next } = (await res.json()) as { slot: AssignmentSlotDTO };
    patchLocal(next);
    router.refresh();
  }, [openSlot, patchLocal, router]);

  if (viewer === "student") {
    // Student sees exactly their own slot (server already filtered). The
    // "grid" path below is teacher-only — AC-10 DOM filtering.
    return (
      <div className="board-canvas-wrap">
        <div className="assign-board assign-board--student">
          <AssignmentStudentView
            slot={slots[0] ?? null}
            guideText={board.assignmentGuideText}
            canSubmit={canStudentSubmit ?? true}
          />
        </div>
      </div>
    );
  }

  const teacherClass =
    view === "matrix"
      ? "assign-board assign-board--teacher assign-board--matrix"
      : "assign-board assign-board--teacher";
  return (
    <div className="board-canvas-wrap">
      <div className={teacherClass}>
        {board.assignmentGuideText && (
          <section className="assign-guide" aria-labelledby="assign-guide-label">
            <div id="assign-guide-label" className="assign-guide__label">
              안내
            </div>
            <div className="assign-guide__body">{board.assignmentGuideText}</div>
          </section>
        )}
        {error && <div className="assign-inline-error">{error}</div>}
        <AssignmentGridView slots={orderedSlots} onOpen={openSlotAndStampView} />
      </div>
      {openSlot && (
        <AssignmentFullscreenModal
          slot={openSlot}
          hasPrev={openIndex > 0}
          hasNext={openIndex >= 0 && openIndex < orderedSlots.length - 1}
          onClose={() => setOpenSlotId(null)}
          onPrev={() => navigateBy(-1)}
          onNext={() => navigateBy(1)}
          onReturn={handleReturn}
          onReview={handleReview}
        />
      )}
    </div>
  );
}
