"use client";

import { useEffect, useState } from "react";
import type { AssignmentSlotDTO } from "@/types/assignment";
import { ReturnReasonInlineEditor } from "./ReturnReasonInlineEditor";

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
  hasPrev: boolean;
  hasNext: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReturn: (reason: string) => Promise<void>;
  onReview: () => Promise<void>;
};

export function AssignmentFullscreenModal({
  slot,
  hasPrev,
  hasNext,
  onClose,
  onPrev,
  onNext,
  onReturn,
  onReview,
}: Props) {
  const [returning, setReturning] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowLeft" && hasPrev && !returning) {
        e.preventDefault();
        onPrev();
      } else if (e.key === "ArrowRight" && hasNext && !returning) {
        e.preventDefault();
        onNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasPrev, hasNext, onClose, onPrev, onNext, returning]);

  // Close the return panel when the caller switches to a different slot so
  // the educator's prev/next flow doesn't accidentally submit against the
  // wrong student.
  useEffect(() => {
    setReturning(false);
  }, [slot.id]);

  const label = STATUS_LABEL[slot.submissionStatus] ?? slot.submissionStatus;
  const thumb = slot.card.thumbUrl ?? slot.card.imageUrl;

  async function handleReturnSubmit(reason: string) {
    if (busy) return;
    setBusy(true);
    try {
      await onReturn(reason);
      setReturning(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleReviewClick() {
    if (busy) return;
    setBusy(true);
    try {
      await onReview();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="assign-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-modal-title"
    >
      <div className="assign-modal__topbar">
        <div className="assign-modal__student">
          <span className="assign-modal__num">{slot.slotNumber}번</span>
          <h2 className="assign-modal__name" id="assign-modal-title">
            {slot.studentName}
          </h2>
          <span className={`assign-badge assign-badge--${slot.submissionStatus}`}>{label}</span>
        </div>
        <div className="assign-modal__meta">
          {slot.returnedAt && <span>반려 {new Date(slot.returnedAt).toLocaleString("ko-KR")}</span>}
          {slot.viewedAt && !slot.returnedAt && (
            <span>확인 {new Date(slot.viewedAt).toLocaleString("ko-KR")}</span>
          )}
        </div>
        <button
          type="button"
          className="assign-modal__close"
          aria-label="닫기"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div className="assign-modal__stage">
        <button
          type="button"
          className="assign-modal__nav"
          aria-label="이전 slot"
          disabled={!hasPrev || returning}
          onClick={onPrev}
        >
          ‹
        </button>
        <div className="assign-modal__media">
          {thumb ? (
            <img src={thumb} alt="" className="assign-modal__media-box" />
          ) : slot.card.content ? (
            <div className="assign-modal__media-box assign-modal__media-box--text">
              {slot.card.content}
            </div>
          ) : (
            <div className="assign-modal__media-box assign-modal__media-box--empty">
              아직 제출된 내용이 없습니다.
            </div>
          )}
        </div>
        <button
          type="button"
          className="assign-modal__nav"
          aria-label="다음 slot"
          disabled={!hasNext || returning}
          onClick={onNext}
        >
          ›
        </button>
      </div>

      <div className="assign-modal__footer">
        {!returning && (
          <>
            <button
              type="button"
              className="assign-btn assign-btn--ghost"
              disabled={busy || slot.submissionStatus === "assigned" || slot.submissionStatus === "orphaned"}
              onClick={() => setReturning(true)}
            >
              반려하기
            </button>
            <button
              type="button"
              className="assign-btn assign-btn--primary"
              disabled={busy || !(slot.submissionStatus === "viewed" || slot.submissionStatus === "submitted")}
              onClick={handleReviewClick}
            >
              확인됨
            </button>
          </>
        )}
      </div>

      {returning && (
        <ReturnReasonInlineEditor
          onSubmit={handleReturnSubmit}
          onCancel={() => setReturning(false)}
          busy={busy}
        />
      )}
    </div>
  );
}
