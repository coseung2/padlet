"use client";

import type { CardData } from "../DraggableCard";
import type { MenuItem } from "../ContextMenu";
import type { BreakoutMembershipData } from "../BreakoutAssignmentManager";
import { BreakoutCardArticle } from "./BreakoutCardArticle";

type SectionData = {
  id: string;
  title: string;
  order: number;
};

type Props = {
  groupIndex: number;
  groupSections: SectionData[];
  groupCapacity: number;
  groupMembers: BreakoutMembershipData[];
  isOwner: boolean;
  canEdit: boolean;
  hasAnyCard: boolean;
  parseSection: (title: string) => { tabTitle: string } | null;
  getCardsForSection: (sectionId: string) => CardData[];
  cardMenuItems: (card: CardData, isPoolCard: boolean) => MenuItem[];
  onOpenCard: (card: CardData) => void;
  onAddInSection: (sectionId: string) => void;
};

export function GroupColumn({
  groupIndex,
  groupSections,
  groupCapacity,
  groupMembers,
  isOwner,
  canEdit,
  hasAnyCard,
  parseSection,
  getCardsForSection,
  cardMenuItems,
  onOpenCard,
  onAddInSection,
}: Props) {
  return (
    <div
      className="column"
      style={{ border: "2px solid var(--color-border,#ddd)", borderRadius: 8 }}
      aria-label={`모둠 ${groupIndex}`}
    >
      <div className="column-header">
        <h3 className="column-title">모둠 {groupIndex}</h3>
        <span className="column-count">
          {groupMembers.length} / {groupCapacity}
        </span>
      </div>
      {isOwner && (
        <div
          style={{
            padding: "2px 8px 8px",
            fontSize: "0.85rem",
            color: "var(--color-muted,#555)",
          }}
        >
          {groupMembers.length === 0 ? (
            <span>아직 배정된 학생 없음</span>
          ) : (
            groupMembers
              .map((m) =>
                m.studentNumber != null
                  ? `${m.studentNumber}. ${m.studentName}`
                  : m.studentName
              )
              .join(", ")
          )}
          {!hasAnyCard && groupMembers.length > 0 && (
            <span
              style={{ color: "var(--color-warn,#8a6d00)", marginLeft: 4 }}
              title="활동 시작 안 됨"
            >
              ⚠ 정체
            </span>
          )}
        </div>
      )}
      <div style={{ display: "grid", gap: 12 }}>
        {groupSections.map((s) => {
          const sectionCards = getCardsForSection(s.id);
          const parsed = parseSection(s.title);
          const tabTitle = parsed?.tabTitle ?? s.title;
          return (
            <div key={s.id}>
              <div className="column-header" style={{ marginTop: 4 }}>
                <h4 className="column-title" style={{ fontSize: "0.95rem" }}>
                  {tabTitle}
                </h4>
                <span className="column-count">{sectionCards.length}</span>
              </div>
              <div className="column-cards">
                {sectionCards.map((c) => (
                  <BreakoutCardArticle
                    key={c.id}
                    card={c}
                    canEdit={canEdit}
                    menuItems={cardMenuItems(c, false)}
                    onOpen={onOpenCard}
                  />
                ))}
                {sectionCards.length === 0 && (
                  <div className="column-empty">아직 카드가 없어요</div>
                )}
              </div>
              {canEdit && (
                <button
                  type="button"
                  className="column-inline-add"
                  onClick={() => onAddInSection(s.id)}
                >
                  + 카드 추가
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
