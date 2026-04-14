"use client";

import { useState, useTransition } from "react";
import { DraggableCard, type CardData } from "./DraggableCard";
import { AddCardButton } from "./AddCardButton";
import { CardDetailModal } from "./cards/CardDetailModal";

type Role = "owner" | "editor" | "viewer";

type Props = {
  boardId: string;
  initialCards: CardData[];
  currentUserId: string;
  currentRole: Role;
};

export function BoardCanvas({
  boardId,
  initialCards,
  currentUserId,
  currentRole,
}: Props) {
  const [cards, setCards] = useState<CardData[]>(initialCards);
  const [openCard, setOpenCard] = useState<CardData | null>(null);
  const [, startTransition] = useTransition();
  const canEdit = currentRole === "owner" || currentRole === "editor";

  function handlePositionChange(id: string, x: number, y: number) {
    let prevX = 0;
    let prevY = 0;
    setCards((list) => {
      const target = list.find((c) => c.id === id);
      if (!target) return list;
      prevX = target.x;
      prevY = target.y;
      return list.map((c) => (c.id === id ? { ...c, x, y } : c));
    });

    startTransition(async () => {
      try {
        const res = await fetch(`/api/cards/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ x, y }),
        });
        if (!res.ok) {
          const msg = await res.text();
          console.error("카드 위치 저장 실패:", msg);
          setCards((list) =>
            list.map((c) =>
              c.id === id ? { ...c, x: prevX, y: prevY } : c
            )
          );
        }
      } catch (err) {
        console.error(err);
        setCards((list) =>
          list.map((c) =>
            c.id === id ? { ...c, x: prevX, y: prevY } : c
          )
        );
      }
    });
  }

  async function handleAdd(data: {
    title: string;
    content: string;
    imageUrl?: string;
    linkUrl?: string;
    linkTitle?: string;
    linkDesc?: string;
    linkImage?: string;
    videoUrl?: string;
    color?: string;
    attachAssetId?: string;
  }) {
    const nextPos = {
      x: 40 + (cards.length % 3) * 280,
      y: 40 + Math.floor(cards.length / 3) * 220,
    };
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
          ...nextPos,
        }),
      });
      if (res.ok) {
        const { card } = await res.json();
        setCards((prev) => [...prev, card]);
        if (data.attachAssetId) {
          // Fire-and-forget: create AssetAttachment row. Card already has the
          // imageUrl from the picker so failures here are cosmetic.
          void fetch(`/api/student-assets/${data.attachAssetId}/attach`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ cardId: card.id }),
          }).catch(() => {});
        }
      } else {
        const msg = await res.text();
        console.error("카드 추가 실패:", msg);
        alert(`카드 추가 실패: ${msg}`);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id: string) {
    const prevCards = cards;
    setCards((list) => list.filter((c) => c.id !== id));
    try {
      const res = await fetch(`/api/cards/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setCards(prevCards);
        const msg = await res.text();
        console.error("삭제 실패:", msg);
        alert(`삭제 실패: ${msg}`);
      }
    } catch (err) {
      console.error(err);
      setCards(prevCards);
    }
  }

  return (
    <div className="board-canvas-wrap">
      <div className="board-canvas">
        {cards.length === 0 && (
          <div className="board-empty">
            {canEdit ? (
              <p>아직 카드가 없어요. 우하단 버튼을 눌러 첫 카드를 추가하세요.</p>
            ) : (
              <p>아직 카드가 없습니다.</p>
            )}
          </div>
        )}
        {cards.map((c) => (
          <DraggableCard
            key={c.id}
            card={c}
            canEdit={canEdit}
            canDelete={
              currentRole === "owner" ||
              (currentRole === "editor" && c.authorId === currentUserId)
            }
            onPositionChange={(x, y) => handlePositionChange(c.id, x, y)}
            onDelete={() => handleDelete(c.id)}
            onOpen={() => setOpenCard(c)}
          />
        ))}
      </div>
      {canEdit && <AddCardButton onAdd={handleAdd} />}
      <CardDetailModal
        card={openCard}
        onClose={() => setOpenCard(null)}
        cards={cards}
        onChange={setOpenCard}
      />
    </div>
  );
}
