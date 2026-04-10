"use client";

import { useState } from "react";

type Props = {
  onAdd: (title: string, content: string) => Promise<void>;
};

export function AddCardButton({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="add-card-btn"
        onClick={() => setOpen(true)}
        aria-label="카드 추가"
      >
        + 카드 추가
      </button>
    );
  }

  return (
    <form
      className="add-card-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setBusy(true);
        await onAdd(title.trim(), content.trim());
        setBusy(false);
        setTitle("");
        setContent("");
        setOpen(false);
      }}
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="카드 제목"
        className="add-card-input"
        maxLength={200}
        required
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="내용 (선택)"
        rows={4}
        className="add-card-textarea"
        maxLength={5000}
      />
      <div className="add-card-actions">
        <button
          type="button"
          onClick={() => {
            setTitle("");
            setContent("");
            setOpen(false);
          }}
          disabled={busy}
        >
          취소
        </button>
        <button type="submit" disabled={busy || !title.trim()}>
          {busy ? "…" : "추가"}
        </button>
      </div>
    </form>
  );
}
