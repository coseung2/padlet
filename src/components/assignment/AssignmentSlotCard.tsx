"use client";

import type { AssignmentSlotDTO } from "@/types/assignment";

const STATUS_LABEL: Record<string, string> = {
  assigned: "미제출",
  submitted: "제출",
  viewed: "확인중",
  returned: "반려",
  reviewed: "확인됨",
  orphaned: "삭제됨",
};

type Props = {
  slot: AssignmentSlotDTO;
  onOpen: (slot: AssignmentSlotDTO) => void;
  disabled?: boolean;
};

export function AssignmentSlotCard({ slot, onOpen, disabled }: Props) {
  const thumb = slot.card.thumbUrl ?? slot.card.imageUrl;
  const label = STATUS_LABEL[slot.submissionStatus] ?? slot.submissionStatus;
  const ariaLabel = `${slot.slotNumber}번 ${slot.studentName}, 상태: ${label}`;

  return (
    <button
      type="button"
      className="assign-slot"
      data-status={slot.submissionStatus}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onOpen(slot)}
    >
      <div className="assign-slot__head">
        <span className="assign-slot__num">{slot.slotNumber}번</span>
        <span className={`assign-badge assign-badge--${slot.submissionStatus}`}>{label}</span>
      </div>
      <div className="assign-slot__thumb">
        {thumb ? (
          <img
            src={thumb}
            alt=""
            loading="lazy"
            width={160}
            height={120}
            className="assign-slot__img"
          />
        ) : (
          <span className="assign-slot__placeholder" aria-hidden="true">
            {slot.slotNumber}
          </span>
        )}
      </div>
      <div className="assign-slot__name">{slot.studentName}</div>
    </button>
  );
}
