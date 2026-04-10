"use client";

import { useState } from "react";
import { AddCardButton } from "./AddCardButton";
import { CardAttachments } from "./CardAttachments";
import type { CardData } from "./DraggableCard";

type Props = {
  boardId: string;
  initialCards: CardData[];
  currentUserId: string;
  currentRole: "owner" | "editor" | "viewer";
};

export function GridBoard({ boardId, initialCards, currentUserId, currentRole }: Props) {
  const [cards, setCards] = useState<CardData[]>(
    [...initialCards].sort((a, b) => a.order - b.order)
  );
  const canEdit = currentRole === "owner" || currentRole === "editor";

  async function handleAdd(data: {
    title: string;
    content: string;
    imageUrl?: string;
    linkUrl?: string;
    videoUrl?: string;
    color?: string;
  }) {
    try {
      const res = await fetch(`/api/cards`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          boardId,
          title: data.title,
          content: data.content,
          imageUrl: data.imageUrl || null,
          linkUrl: data.linkUrl || null,
          linkTitle: data.linkTitle || null,
          linkDesc: data.linkDesc || null,
          linkImage: data.linkImage || null,
          videoUrl: data.videoUrl || null,
          color: data.color || null,
          x: 0,
          y: 0,
          order: cards.length,
        }),
      });
      if (res.ok) {
        const { card } = await res.json();
        setCards((prev) => [...prev, card]);
      } else {
        alert(`카드 추가 실패: ${await res.text()}`);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id: string) {
    const prev = cards;
    setCards((list) => list.filter((c) => c.id !== id));
    try {
      const res = await fetch(`/api/cards/${id}`, { method: "DELETE" });
      if (!res.ok) setCards(prev);
    } catch {
      setCards(prev);
    }
  }

  return (
    <div className="board-canvas-wrap">
      <div className="grid-board">
        {cards.length === 0 && (
          <div className="board-empty-inline">
            <p>{canEdit ? "카드를 추가해서 그리드를 채워보세요." : "아직 카드가 없습니다."}</p>
          </div>
        )}
        {cards.map((c) => (
          <article
            key={c.id}
            className="grid-card"
            style={{ backgroundColor: c.color ?? undefined }}
            aria-label={c.title}
          >
            <CardAttachments imageUrl={c.imageUrl} linkUrl={c.linkUrl} linkTitle={c.linkTitle} linkDesc={c.linkDesc} linkImage={c.linkImage} videoUrl={c.videoUrl} />
            <h3 className="padlet-card-title">{c.title}</h3>
            <p className="padlet-card-content">{c.content}</p>
            {(currentRole === "owner" || (currentRole === "editor" && c.authorId === currentUserId)) && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`"${c.title}" 카드를 삭제할까요?`)) handleDelete(c.id);
                }}
                className="padlet-card-delete"
                aria-label={`${c.title} 삭제`}
              >
                ×
              </button>
            )}
          </article>
        ))}
      </div>
      {canEdit && <AddCardButton onAdd={handleAdd} />}
    </div>
  );
}
