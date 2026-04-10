"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  boardId: string;
  initialTitle: string;
  canEdit: boolean;
};

export function EditableTitle({ boardId, initialTitle, canEdit }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle || "제목 없음");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== title) {
      setTitle(trimmed);
      try {
        const res = await fetch(`/api/boards/${boardId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: trimmed }),
        });
        if (res.ok) router.refresh();
      } catch (err) {
        console.error(err);
        setTitle(title); // revert
      }
    }
    setEditing(false);
  }

  if (!canEdit) {
    return <h1 className="board-title">{title}</h1>;
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="board-title-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
        maxLength={200}
      />
    );
  }

  return (
    <h1
      className="board-title board-title-editable"
      onClick={() => {
        setDraft(title === "제목 없음" ? "" : title);
        setEditing(true);
      }}
      title="클릭하여 제목 편집"
    >
      {title}
    </h1>
  );
}
