"use client";

import { useState } from "react";
import { ASSIGNMENT_RETURN_REASON_MAX } from "@/lib/assignment-schemas";

type Props = {
  onSubmit: (reason: string) => Promise<void> | void;
  onCancel: () => void;
  busy?: boolean;
};

export function ReturnReasonInlineEditor({ onSubmit, onCancel, busy }: Props) {
  const [value, setValue] = useState("");
  const len = value.length;
  const canSubmit = len >= 1 && len <= ASSIGNMENT_RETURN_REASON_MAX && !busy;

  return (
    <div className="assign-reason-panel" data-open="true">
      <label className="assign-reason__label" htmlFor="assign-reason-textarea">
        반려 사유
      </label>
      <textarea
        id="assign-reason-textarea"
        className="assign-reason__textarea"
        autoFocus
        rows={3}
        maxLength={ASSIGNMENT_RETURN_REASON_MAX}
        value={value}
        placeholder="예: 표지 사진 없이 제목만 있어 다시 올려주세요."
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="assign-reason__row">
        <span className="assign-reason__counter" aria-live="polite">
          {len} / {ASSIGNMENT_RETURN_REASON_MAX}
        </span>
        <div className="assign-reason__actions">
          <button
            type="button"
            className="assign-btn assign-btn--ghost"
            onClick={onCancel}
            disabled={busy}
          >
            취소
          </button>
          <button
            type="button"
            className="assign-btn assign-btn--danger"
            onClick={() => onSubmit(value)}
            disabled={!canSubmit}
          >
            반려하기
          </button>
        </div>
      </div>
    </div>
  );
}
