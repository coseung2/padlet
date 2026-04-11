"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  classroomId: string;
  onClose: () => void;
  onAdded: () => void;
};

export function AddStudentsModal({ open, classroomId, onClose, onAdded }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const names = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (names.length === 0) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/classroom/${classroomId}/students`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ names }),
      });
      if (res.ok) {
        onAdded();
      } else {
        alert(`학생 추가 실패: ${await res.text()}`);
      }
    } catch (err) {
      console.error(err);
    }
    setBusy(false);
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="add-card-modal add-students-modal">
        <div className="modal-header">
          <h2 className="modal-title">학생 추가</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <label className="modal-field-label">
            학생 이름 (한 줄에 한 명)
          </label>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"홍길동\n김철수\n이영희"}
            rows={8}
            className="modal-textarea add-students-textarea"
          />
          <p className="add-students-count">
            {names.length > 0 ? `${names.length}명 입력됨` : "이름을 입력하세요"}
          </p>

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="modal-btn-cancel"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={busy || names.length === 0}
              className="modal-btn-submit"
            >
              {busy ? "추가 중..." : `${names.length}명 추가`}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
