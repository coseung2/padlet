"use client";

import type { CardData } from "../DraggableCard";

type Props = {
  cards: CardData[];
  canControl: boolean;
  /** Called when the user drags a played card back into the main queue.
   *  DJBoard maps that to: queueStatus = "approved" + reinsert at the end. */
  onRestore: (cardId: string) => void;
  /** Called when the user taps the delete button on a played card.
   *  DJBoard maps that to DELETE /api/boards/:id/queue/:cardId. */
  onDelete: (cardId: string) => void;
};

export function DJPlayedStack({ cards, canControl, onRestore, onDelete }: Props) {
  if (cards.length === 0) return null;

  function handleDragStart(
    e: React.DragEvent<HTMLLIElement>,
    cardId: string
  ) {
    if (!canControl) return;
    e.dataTransfer.effectAllowed = "move";
    // Use a distinct MIME so the queue drop target can discriminate restores
    // from queue-internal reorders.
    e.dataTransfer.setData("application/x-dj-played", cardId);
    e.dataTransfer.setData("text/plain", cardId);
  }

  return (
    <aside
      className="dj-played-stack"
      aria-label="재생 완료된 곡"
      onDragOver={(e) => {
        // Accept drops from the queue so DJ can push an unwanted card into
        // the played pile without marking it via the action menu.
        if (canControl && e.dataTransfer.types.includes("text/plain")) {
          e.preventDefault();
        }
      }}
    >
      <h3 className="dj-played-title">재생 완료</h3>
      <ul className="dj-played-list">
        {cards.map((card) => (
          <li
            key={card.id}
            className="dj-played-item"
            draggable={canControl}
            onDragStart={(e) => handleDragStart(e, card.id)}
            onDoubleClick={() => canControl && onRestore(card.id)}
            title={canControl ? "끌어서 큐로 되돌리기 · 더블클릭으로 복귀" : card.title}
          >
            {card.linkImage && (
              <img
                className="dj-played-thumb"
                src={card.linkImage}
                width={64}
                height={36}
                alt=""
              />
            )}
            <span className="dj-played-item-title">{card.title}</span>
            {canControl && (
              <button
                type="button"
                className="dj-played-delete"
                aria-label="재생 완료 곡 삭제"
                title="삭제"
                // 폴리필(drag-drop-touch)이 상위 li의 dragstart를 터치에서 합성
                // 하므로, 버튼 영역을 드래그 원점에서 제외해 탭만 가도록.
                draggable={false}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(card.id);
                }}
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
