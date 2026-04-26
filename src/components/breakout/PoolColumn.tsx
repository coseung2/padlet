"use client";

import type { CardData } from "../DraggableCard";
import type { MenuItem } from "../ContextMenu";
import { BreakoutCardArticle } from "./BreakoutCardArticle";

type Props = {
  sectionId: string;
  sectionTitle: string;
  sectionCards: CardData[];
  canEdit: boolean;
  cardMenuItems: (card: CardData, isPoolCard: boolean) => MenuItem[];
  onOpenCard: (card: CardData) => void;
  onAddInSection: (sectionId: string) => void;
};

export function PoolColumn({
  sectionId,
  sectionTitle,
  sectionCards,
  canEdit,
  cardMenuItems,
  onOpenCard,
  onAddInSection,
}: Props) {
  return (
    <div className="column" style={{ width: "100%" }}>
      <div className="column-header">
        <h3 className="column-title">📎 {sectionTitle}</h3>
        <span className="column-count">{sectionCards.length}</span>
      </div>
      <div
        className="column-cards"
        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
      >
        {sectionCards.map((c) => (
          <BreakoutCardArticle
            key={c.id}
            card={c}
            canEdit={canEdit}
            menuItems={cardMenuItems(c, true)}
            onOpen={onOpenCard}
            style={{ minWidth: 220 }}
          />
        ))}
        {sectionCards.length === 0 && (
          <div className="column-empty">공용 자료를 여기에 추가하세요</div>
        )}
      </div>
      {canEdit && (
        <button
          type="button"
          className="column-inline-add"
          onClick={() => onAddInSection(sectionId)}
        >
          + 자료 추가
        </button>
      )}
    </div>
  );
}
