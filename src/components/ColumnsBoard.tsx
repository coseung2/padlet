"use client";

import { useState } from "react";
import { AddCardButton } from "./AddCardButton";
import type { CardData } from "./DraggableCard";

type SectionData = {
  id: string;
  title: string;
  order: number;
};

type Props = {
  boardId: string;
  initialCards: CardData[];
  initialSections: SectionData[];
  currentUserId: string;
  currentRole: "owner" | "editor" | "viewer";
};

export function ColumnsBoard({
  boardId,
  initialCards,
  initialSections,
  currentUserId,
  currentRole,
}: Props) {
  const [cards, setCards] = useState<CardData[]>(initialCards);
  const [sections, setSections] = useState<SectionData[]>(
    [...initialSections].sort((a, b) => a.order - b.order)
  );
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const canEdit = currentRole === "owner" || currentRole === "editor";

  function getCardsForSection(sectionId: string) {
    return cards
      .filter((c) => c.sectionId === sectionId)
      .sort((a, b) => a.order - b.order);
  }

  function getUnsectionedCards() {
    return cards
      .filter((c) => !c.sectionId)
      .sort((a, b) => a.order - b.order);
  }

  async function handleDropOnSection(cardId: string, targetSectionId: string | null) {
    const sectionCards = targetSectionId
      ? getCardsForSection(targetSectionId)
      : getUnsectionedCards();
    const newOrder = sectionCards.length;

    setCards((list) =>
      list.map((c) =>
        c.id === cardId ? { ...c, sectionId: targetSectionId, order: newOrder } : c
      )
    );

    try {
      const res = await fetch(`/api/cards/${cardId}/move`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sectionId: targetSectionId, order: newOrder }),
      });
      if (!res.ok) {
        console.error("이동 실패:", await res.text());
        setCards(initialCards); // revert
      }
    } catch (err) {
      console.error(err);
      setCards(initialCards);
    }
    setDraggedCard(null);
  }

  async function handleAdd(title: string, content: string) {
    // 첫 섹션에 추가 (없으면 unsectioned)
    const targetSection = sections[0]?.id ?? null;
    const order = targetSection ? getCardsForSection(targetSection).length : getUnsectionedCards().length;

    try {
      const res = await fetch(`/api/cards`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          boardId,
          title,
          content,
          x: 0,
          y: 0,
          order,
          sectionId: targetSection,
        }),
      });
      if (res.ok) {
        const { card } = await res.json();
        setCards((prev) => [...prev, { ...card, sectionId: card.sectionId ?? targetSection }]);
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

  async function handleAddSection() {
    const title = window.prompt("새 섹션 이름:");
    if (!title?.trim()) return;
    try {
      const res = await fetch(`/api/sections`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ boardId, title: title.trim() }),
      });
      if (res.ok) {
        const { section } = await res.json();
        setSections((prev) => [...prev, section]);
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="board-canvas-wrap">
      <div className="columns-board">
        {sections.map((section) => (
          <div
            key={section.id}
            className={`column ${draggedCard ? "column-drop-target" : ""}`}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("column-drag-over"); }}
            onDragLeave={(e) => e.currentTarget.classList.remove("column-drag-over")}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("column-drag-over");
              if (draggedCard) handleDropOnSection(draggedCard, section.id);
            }}
          >
            <div className="column-header">
              <h3 className="column-title">{section.title}</h3>
              <span className="column-count">{getCardsForSection(section.id).length}</span>
            </div>
            <div className="column-cards">
              {getCardsForSection(section.id).map((c) => (
                <article
                  key={c.id}
                  className="column-card"
                  style={{ backgroundColor: c.color ?? undefined }}
                  draggable={canEdit}
                  onDragStart={() => setDraggedCard(c.id)}
                  onDragEnd={() => setDraggedCard(null)}
                >
                  <h4 className="padlet-card-title">{c.title}</h4>
                  <p className="padlet-card-content">{c.content}</p>
                  {(currentRole === "owner" || (currentRole === "editor" && c.authorId === currentUserId)) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`"${c.title}" 삭제?`)) handleDelete(c.id);
                      }}
                      className="padlet-card-delete"
                    >
                      ×
                    </button>
                  )}
                </article>
              ))}
            </div>
          </div>
        ))}

        {/* unsectioned cards */}
        {getUnsectionedCards().length > 0 && (
          <div
            className={`column column-unsectioned ${draggedCard ? "column-drop-target" : ""}`}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("column-drag-over"); }}
            onDragLeave={(e) => e.currentTarget.classList.remove("column-drag-over")}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("column-drag-over");
              if (draggedCard) handleDropOnSection(draggedCard, null);
            }}
          >
            <div className="column-header">
              <h3 className="column-title">미분류</h3>
              <span className="column-count">{getUnsectionedCards().length}</span>
            </div>
            <div className="column-cards">
              {getUnsectionedCards().map((c) => (
                <article
                  key={c.id}
                  className="column-card"
                  style={{ backgroundColor: c.color ?? undefined }}
                  draggable={canEdit}
                  onDragStart={() => setDraggedCard(c.id)}
                  onDragEnd={() => setDraggedCard(null)}
                >
                  <h4 className="padlet-card-title">{c.title}</h4>
                  <p className="padlet-card-content">{c.content}</p>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* Add section button */}
        {canEdit && (
          <button type="button" className="column-add-btn" onClick={handleAddSection}>
            + 섹션 추가
          </button>
        )}
      </div>
      {canEdit && <AddCardButton onAdd={handleAdd} />}
    </div>
  );
}
