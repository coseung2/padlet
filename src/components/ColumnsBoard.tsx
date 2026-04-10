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
  const [overSectionId, setOverSectionId] = useState<string | null>(null);
  const canEdit = currentRole === "owner" || currentRole === "editor";

  function getCardsForSection(sectionId: string) {
    return cards
      .filter((c) => c.sectionId === sectionId)
      .sort((a, b) => a.order - b.order);
  }

  async function moveCard(cardId: string, targetSectionId: string) {
    const targetCards = getCardsForSection(targetSectionId);
    const newOrder = targetCards.length;
    const prevCards = [...cards];

    setCards((list) =>
      list.map((c) =>
        c.id === cardId ? { ...c, sectionId: targetSectionId, order: newOrder } : c
      )
    );

    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sectionId: targetSectionId, order: newOrder }),
      });
      if (!res.ok) {
        console.error("이동 실패:", await res.text());
        setCards(prevCards);
      }
    } catch (err) {
      console.error(err);
      setCards(prevCards);
    }
  }

  function handleDragStart(e: React.DragEvent, cardId: string) {
    e.dataTransfer.setData("application/card-id", cardId);
    e.dataTransfer.effectAllowed = "move";
    // ghost image opacity
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  }

  function handleDragEnd(e: React.DragEvent) {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setOverSectionId(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, targetSectionId: string) {
    e.preventDefault();
    setOverSectionId(null);
    const cardId = e.dataTransfer.getData("application/card-id");
    if (cardId) {
      moveCard(cardId, targetSectionId);
    }
  }

  async function handleAdd(title: string, content: string) {
    const targetSection = sections[0]?.id ?? null;
    const order = targetSection ? getCardsForSection(targetSection).length : 0;
    try {
      const res = await fetch(`/api/cards`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ boardId, title, content, x: 0, y: 0, order, sectionId: targetSection }),
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
    const prev = [...cards];
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
            className="column"
            onDragOver={handleDragOver}
            onDragEnter={() => setOverSectionId(section.id)}
            onDragLeave={(e) => {
              // Only clear if leaving the column itself (not entering a child)
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setOverSectionId(null);
              }
            }}
            onDrop={(e) => handleDrop(e, section.id)}
          >
            <div className="column-header">
              <h3 className="column-title">{section.title}</h3>
              <span className="column-count">{getCardsForSection(section.id).length}</span>
            </div>
            <div className={`column-cards ${overSectionId === section.id ? "column-cards-active" : ""}`}>
              {getCardsForSection(section.id).map((c) => (
                <article
                  key={c.id}
                  className="column-card"
                  style={{ backgroundColor: c.color ?? undefined }}
                  draggable={canEdit}
                  onDragStart={(e) => handleDragStart(e, c.id)}
                  onDragEnd={handleDragEnd}
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
              {getCardsForSection(section.id).length === 0 && (
                <div className="column-empty">카드를 여기로 끌어오세요</div>
              )}
            </div>
          </div>
        ))}

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
