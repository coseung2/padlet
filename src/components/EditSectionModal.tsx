"use client";

import { useState } from "react";

type Props = {
  title: string;
  onSave: (newTitle: string) => Promise<void>;
  onClose: () => void;
};

export function EditSectionModal({ title: initialTitle, onSave, onClose }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="add-card-modal" style={{ width: 400 }}>
        <div className="modal-header">
          <h2 className="modal-title">섹션 수정</h2>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <form
          className="modal-body"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) return;
            setBusy(true);
            await onSave(title.trim());
            setBusy(false);
            onClose();
          }}
        >
          <label className="modal-field-label">섹션 이름</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="modal-input"
            maxLength={100}
            required
          />
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={busy} className="modal-btn-cancel">취소</button>
            <button type="submit" disabled={busy || !title.trim()} className="modal-btn-submit">
              {busy ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
