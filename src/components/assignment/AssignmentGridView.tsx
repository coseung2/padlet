"use client";

import { memo } from "react";
import type { AssignmentSlotDTO } from "@/types/assignment";
import { AssignmentSlotCard } from "./AssignmentSlotCard";

type Props = {
  slots: AssignmentSlotDTO[];
  onOpen: (slot: AssignmentSlotDTO) => void;
  busySlotId?: string | null;
  isClassroomAttached?: boolean;
};

function AssignmentGridViewImpl({ slots, onOpen, busySlotId, isClassroomAttached }: Props) {
  if (slots.length === 0) {
    return (
      <div className="assign-grid__empty">
        {isClassroomAttached ? (
          <>
            <p>학급에 학생이 없습니다.</p>
            <p className="assign-grid__empty-hint">
              학급에 학생을 추가한 뒤 우하단 버튼으로 slot을 동기화하세요.
            </p>
          </>
        ) : (
          <>
            <p>아직 학급을 배당하지 않았습니다.</p>
            <p className="assign-grid__empty-hint">
              우하단 <strong>학급 배당</strong> 버튼으로 학급을 연결하면 학생 수만큼 slot이 자동 생성됩니다.
            </p>
          </>
        )}
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
