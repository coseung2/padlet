"use client";

import { useState } from "react";

export function SaveDialog({
  busy,
  error,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (opts: { title: string; shared: boolean }) => void;
}) {
  const [title, setTitle] = useState("");
  const [shared, setShared] = useState(false);

  return (
    <div
      className="ds-save-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="그림 저장"
    >
      <div className="ds-save-dialog">
        <h3>그림 저장</h3>
        <label className="ds-field-label">
          제목
          <input
            type="text"
            className="ds-text-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="내 그림"
            maxLength={120}
          />
        </label>
        <label className="ds-checkbox-label">
          <input
            type="checkbox"
            checked={shared}
            onChange={(e) => setShared(e.target.checked)}
          />
          반 갤러리에 공유
        </label>

        {error && <div className="ds-save-error">{error}</div>}

        <div className="ds-save-actions">
          <button
            type="button"
            className="ds-btn ds-btn-secondary"
            onClick={onCancel}
            disabled={busy}
          >
            취소
          </button>
          <button
            type="button"
            className="ds-btn ds-btn-primary"
            onClick={() => onSubmit({ title: title.trim() || "내 그림", shared })}
            disabled={busy}
          >
            {busy ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
