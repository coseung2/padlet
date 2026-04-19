"use client";

import type { CardData } from "../DraggableCard";

type Props = {
  cards: CardData[];
  canControl: boolean;
  /** Called when the user drags a played card back into the main queue.
   *  DJBoard maps that to: queueStatus = "approved" + reinsert at the end. */
  onRestore: (cardId: string) => void;
};

export function DJPlayedStack({ cards, canControl, onRestore }: Props) {
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
          </li>
        ))}
      </ul>
    </aside>
  );
}
