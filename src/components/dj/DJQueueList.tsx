"use client";

import { useState } from "react";
import type { CardData } from "../DraggableCard";
import { DJQueueItem } from "./DJQueueItem";

type Props = {
  cards: CardData[];
  canControl: boolean;
  currentStudentId: string | null;
  onStatus: (
    cardId: string,
    status: "approved" | "rejected" | "played"
  ) => void;
  onDelete: (cardId: string) => void;
  onReorder: (cardId: string, newOrder: number) => void;
};

export function DJQueueList({
  cards,
  canControl,
  currentStudentId,
  onStatus,
  onDelete,
  onReorder,
}: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function handleDragStart(
    e: React.DragEvent<HTMLLIElement>,
    cardId: string
  ) {
    if (!canControl) return;
    setDraggingId(cardId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", cardId);
  }

  function handleDragOver(
    e: React.DragEvent<HTMLLIElement>,
    cardId: string
  ) {
    if (!canControl || !draggingId) return;
    e.preventDefault();
    setOverId(cardId);
  }

  function handleDrop(
    e: React.DragEvent<HTMLLIElement>,
    targetCardId: string
  ) {
    if (!canControl || !draggingId) return;
    e.preventDefault();
    setOverId(null);
    const draggedId = draggingId;
    setDraggingId(null);
    if (draggedId === targetCardId) return;
    const target = cards.find((c) => c.id === targetCardId);
    if (!target) return;
    // Place dragged right before target by using (target.order - 0.5).
    // Server stores integer order, so we use target.order (and push target
    // forward by 1 implicitly on next reorder). MVP keeps this simple —
    // collisions resolve on next SSE snapshot.
    onReorder(draggedId, target.order);
  }

  return (
    <ul className="dj-queue-list">
      {cards.map((card, idx) => {
        const isOwnPending =
          card.queueStatus === "pending" &&
          !!currentStudentId &&
          card.studentAuthorId === currentStudentId;
        return (
          <DJQueueItem
            key={card.id}
            card={card}
            rank={idx + 1}
            canControl={canControl}
            isOwnPending={isOwnPending}
            isDragging={draggingId === card.id}
            isDragOver={overId === card.id}
            onDragStart={(e) => handleDragStart(e, card.id)}
            onDragOver={(e) => handleDragOver(e, card.id)}
            onDrop={(e) => handleDrop(e, card.id)}
            onApprove={() => onStatus(card.id, "approved")}
            onReject={() => onStatus(card.id, "rejected")}
            onMarkPlayed={() => onStatus(card.id, "played")}
            onDelete={() => onDelete(card.id)}
          />
        );
      })}
    </ul>
  );
}
