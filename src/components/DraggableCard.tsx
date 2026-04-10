"use client";

import { useRef } from "react";
import Draggable, {
  type DraggableData,
  type DraggableEvent,
} from "react-draggable";

export type CardData = {
  id: string;
  title: string;
  content: string;
  color: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;
  sectionId?: string | null;
  authorId: string;
  createdAt?: string;
};

type Props = {
  card: CardData;
  canEdit: boolean;
  canDelete: boolean;
  onPositionChange: (x: number, y: number) => void;
  onDelete: () => void;
};

export function DraggableCard({
  card,
  canEdit,
  canDelete,
  onPositionChange,
  onDelete,
}: Props) {
  const nodeRef = useRef<HTMLElement>(null);

  // Static render for viewers — no react-draggable wrapper
  if (!canEdit) {
    return (
      <article
        ref={nodeRef}
        className="padlet-card is-static"
        style={{
          position: "absolute",
          left: card.x,
          top: card.y,
          width: card.width,
          minHeight: card.height,
          backgroundColor: card.color ?? undefined,
        }}
        aria-label={card.title}
      >
        <h3 className="padlet-card-title">{card.title}</h3>
        <p className="padlet-card-content">{card.content}</p>
      </article>
    );
  }

  return (
    <Draggable
      nodeRef={nodeRef as React.RefObject<HTMLElement>}
      position={{ x: card.x, y: card.y }}
      onStop={(_e: DraggableEvent, data: DraggableData) => {
        if (data.x !== card.x || data.y !== card.y) {
          onPositionChange(data.x, data.y);
        }
      }}
      cancel=".padlet-card-delete"
      bounds="parent"
    >
      <article
        ref={nodeRef}
        className="padlet-card is-draggable"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: card.width,
          minHeight: card.height,
          backgroundColor: card.color ?? undefined,
        }}
        aria-label={card.title}
      >
        <h3 className="padlet-card-title">{card.title}</h3>
        <p className="padlet-card-content">{card.content}</p>
        {canDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`"${card.title}" 카드를 삭제할까요?`)) {
                onDelete();
              }
            }}
            className="padlet-card-delete"
            aria-label={`${card.title} 카드 삭제`}
          >
            ×
          </button>
        )}
      </article>
    </Draggable>
  );
}
