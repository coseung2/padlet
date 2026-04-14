"use client";

import { memo } from "react";
import type { AssignmentSlotDTO } from "@/types/assignment";
import { AssignmentSlotCard } from "./AssignmentSlotCard";

type Props = {
  slots: AssignmentSlotDTO[];
  onOpen: (slot: AssignmentSlotDTO) => void;
  busySlotId?: string | null;
};

function AssignmentGridViewImpl({ slots, onOpen, busySlotId }: Props) {
  if (slots.length === 0) {
    return (
      <div className="assign-grid__empty">
        <p>학급에 학생이 없습니다.</p>
        <p className="assign-grid__empty-hint">
          학급에 학생을 추가한 뒤 "로스터 동기화"를 눌러 새 slot을 추가하세요.
        </p>
      </div>
    );
  }
  return (
    // role=grid implies full arrow-key cell navigation per WAI-ARIA. Native
    // tab-through of <button>s is honest here; skip the grid role to avoid
    // mis-signalling to assistive tech.
    <div className="assign-grid" aria-label="학생 slot 목록">
      {slots.map((slot) => (
        <AssignmentSlotCard
          key={slot.id}
          slot={slot}
          onOpen={onOpen}
          disabled={busySlotId === slot.id}
        />
      ))}
    </div>
  );
}

export const AssignmentGridView = memo(AssignmentGridViewImpl);
