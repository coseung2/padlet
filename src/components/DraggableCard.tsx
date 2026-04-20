"use client";

import { useRef } from "react";
import Draggable, {
  type DraggableData,
  type DraggableEvent,
} from "react-draggable";
import { CardBody } from "./cards/CardBody";

export type CardData = {
  id: string;
  title: string;
  content: string;
  color: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  linkTitle?: string | null;
  linkDesc?: string | null;
  linkImage?: string | null;
  videoUrl?: string | null;
  /** card-file-attachment — 일반 파일 첨부 (PDF/DOCX/XLSX/PPTX/HWP/TXT/ZIP) */
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileMimeType?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;
  sectionId?: string | null;
  authorId: string;
  studentAuthorId?: string | null;
  createdAt?: string;
  externalAuthorName?: string | null;
  studentAuthorName?: string | null;
  authorName?: string | null;
  /** DJ queue status. null on non-dj-queue boards. */
  queueStatus?: string | null;
  /** CardAuthor join rows. When empty, CardAuthorFooter falls back to the
   *  legacy pickAuthorName(external, student, author) chain. Sorted
   *  ascending by .order — primary is index 0. */
  authors?: Array<{
    id: string;
    studentId: string | null;
    displayName: string;
    order: number;
  }>;
};

type Props = {
  card: CardData;
  canEdit: boolean;
  canDelete: boolean;
  onPositionChange: (x: number, y: number) => void;
  onDelete: () => void;
  onOpen: () => void;
};

export function DraggableCard({
  card,
  canEdit,
  canDelete,
  onPositionChange,
  onDelete,
  onOpen,
}: Props) {
  const nodeRef = useRef<HTMLElement>(null);

  // Static render for viewers — no react-draggable wrapper
  if (!canEdit) {
    return (
      <article
        ref={nodeRef}
        className="padlet-card is-static is-clickable"
        style={{
          position: "absolute",
          left: card.x,
          top: card.y,
          width: card.width,
          minHeight: card.height,
          backgroundColor: card.color ?? undefined,
        }}
        aria-label={card.title}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        tabIndex={0}
        role="button"
      >
        <CardBody card={card} />
      </article>
    );
  }

  return (
    <Draggable
      nodeRef={nodeRef as React.RefObject<HTMLElement>}
      position={{ x: card.x, y: card.y }}
      onStop={(_e: DraggableEvent, data: DraggableData) => {
        // Drag — commit the new position. No drag (data.x/y unchanged) =
        // click; open the detail modal instead.
        if (data.x !== card.x || data.y !== card.y) {
          onPositionChange(data.x, data.y);
        } else {
          onOpen();
        }
      }}
      cancel=".padlet-card-delete"
      bounds="parent"
    >
      <article
        ref={nodeRef}
        className="padlet-card is-draggable is-clickable"
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
        <CardBody card={card} />
        {canDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`"${card.title}" 카드를 삭제할까요?`)) {
                onDelete();
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
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
