"use client";

/**
 * BreakoutBoard — teacher pool view for layout="breakout" (BR-3 / BR-4).
 *
 * Renders every group section grouped by 모둠, plus a shared teacher-pool band
 * at the top (if the template has sharedSections). Each card gets a context
 * menu with the "모든 모둠에 복제" bulk-copy action (BR-4), which calls
 * POST /api/breakout/assignments/[id]/copy-card.
 *
 * Student views (own-only / peek-others gating) are out of scope for the
 * foundation agent — handled by BR-5/BR-6 via the existing
 * /board/[id]/s/[sectionId] route (T0-①).
 */
import { useMemo, useState } from "react";
import { AddCardButton } from "./AddCardButton";
import { AddCardModal, type AddCardData } from "./AddCardModal";
import { CardAttachments } from "./CardAttachments";
import { ContextMenu, type MenuItem } from "./ContextMenu";
import { EditCardModal } from "./EditCardModal";
import type { CardData } from "./DraggableCard";

type SectionData = {
  id: string;
  title: string;
  order: number;
};

type AssignmentData = {
  id: string;
  templateId: string;
  templateName: string;
  templateKey: string;
  groupCount: number;
  groupCapacity: number;
  visibility: "own-only" | "peek-others";
  sharedSectionTitles: string[];
};

type Props = {
  boardId: string;
  boardTitle: string;
  assignment: AssignmentData;
  initialCards: CardData[];
  initialSections: SectionData[];
  currentUserId: string;
  currentRole: "owner" | "editor" | "viewer";
};

/**
 * Parse a section title "모둠 3 · K (아는 것)" into { groupIndex: 3, tabTitle: "K (아는 것)" }.
 * Returns null if the title isn't a group section (e.g. teacher-pool).
 */
function parseGroupSection(title: string): { groupIndex: number; tabTitle: string } | null {
  const m = /^모둠\s+(\d+)\s+·\s+(.+)$/.exec(title);
  if (!m) return null;
  return { groupIndex: Number(m[1]), tabTitle: m[2] };
}

export function BreakoutBoard({
  boardId,
  boardTitle,
  assignment,
  initialCards,
  initialSections,
  currentUserId,
  currentRole,
}: Props) {
  const [cards, setCards] = useState<CardData[]>(initialCards);
  const [sections, setSections] = useState<SectionData[]>(
    [...initialSections].sort((a, b) => a.order - b.order)
  );
  const [editingCard, setEditingCard] = useState<CardData | null>(null);
  const [addForSection, setAddForSection] = useState<string | null>(null);
  const [copying, setCopying] = useState<string | null>(null);
  const canEdit = currentRole === "owner" || currentRole === "editor";
  const canBulkCopy = currentRole === "owner";

  const poolTitles = useMemo(
    () => new Set(assignment.sharedSectionTitles),
    [assignment.sharedSectionTitles]
  );

  // Split sections into teacher-pool vs group. Group sections are grouped by
  // their "모둠 N" prefix; inside each group, section order is preserved.
  const { poolSections, groupedSections } = useMemo(() => {
    const pool: SectionData[] = [];
    const groups = new Map<number, SectionData[]>();
    for (const s of sections) {
      if (poolTitles.has(s.title)) {
        pool.push(s);
        continue;
      }
      const parsed = parseGroupSection(s.title);
      if (!parsed) {
        // Unrecognised — treat as pool so it still renders.
        pool.push(s);
        continue;
      }
      const arr = groups.get(parsed.groupIndex);
      if (arr) arr.push(s);
      else groups.set(parsed.groupIndex, [s]);
    }
    const sortedGroups = [...groups.entries()].sort((a, b) => a[0] - b[0]);
    return { poolSections: pool, groupedSections: sortedGroups };
  }, [sections, poolTitles]);

  const cardsBySection = useMemo(() => {
    const map = new Map<string, CardData[]>();
    const sorted = [...cards].sort((a, b) => a.order - b.order);
    for (const c of sorted) {
      const key = c.sectionId ?? "";
      const bucket = map.get(key);
      if (bucket) bucket.push(c);
      else map.set(key, [c]);
    }
    return map;
  }, [cards]);

  function getCardsForSection(sectionId: string): CardData[] {
    return cardsBySection.get(sectionId) ?? [];
  }

  async function handleAdd(data: AddCardData) {
    const targetSection = data.sectionId ?? addForSection ?? sections[0]?.id ?? null;
    const order = targetSection ? getCardsForSection(targetSection).length : 0;
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
          x: 0, y: 0, order,
          sectionId: targetSection,
        }),
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

  async function handleDeleteCard(id: string) {
    if (!window.confirm("이 카드를 삭제할까요?")) return;
    const prev = [...cards];
    setCards((list) => list.filter((c) => c.id !== id));
    try {
      const res = await fetch(`/api/cards/${id}`, { method: "DELETE" });
      if (!res.ok) setCards(prev);
    } catch {
      setCards(prev);
    }
  }

  async function handleEditCardSave(updates: Partial<CardData>) {
    if (!editingCard) return;
    const prev = [...cards];
    setCards((list) =>
      list.map((c) => (c.id === editingCard.id ? { ...c, ...updates } : c))
    );
    try {
      const res = await fetch(`/api/cards/${editingCard.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) setCards(prev);
    } catch {
      setCards(prev);
    }
  }

  async function handleCopyToAllGroups(sourceCard: CardData) {
    if (poolTitles.has(
      sections.find((s) => s.id === sourceCard.sectionId)?.title ?? ""
    )) {
      alert("팀 공용 자료 섹션의 카드는 일괄 복제 대상이 아니에요.");
      return;
    }
    if (!window.confirm(
      `"${sourceCard.title}" 카드를 모든 모둠 섹션에 복제할까요?\n(팀 공용 섹션 제외)`
    )) return;

    setCopying(sourceCard.id);
    try {
      const res = await fetch(
        `/api/breakout/assignments/${assignment.id}/copy-card`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sourceCardId: sourceCard.id }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`복제 실패: ${data.error ?? res.statusText}`);
        return;
      }
      const { copiedTo, cards: newCards } = await res.json();

      // Merge newly created cards into state. Each row is a full Card record.
      if (Array.isArray(newCards) && newCards.length > 0) {
        setCards((prev) => [
          ...prev,
          ...newCards.map((c: Record<string, unknown>) => ({
            id: String(c.id),
            title: String(c.title ?? ""),
            content: String(c.content ?? ""),
            color: (c.color as string | null) ?? null,
            imageUrl: (c.imageUrl as string | null) ?? null,
            linkUrl: (c.linkUrl as string | null) ?? null,
            linkTitle: (c.linkTitle as string | null) ?? null,
            linkDesc: (c.linkDesc as string | null) ?? null,
            linkImage: (c.linkImage as string | null) ?? null,
            videoUrl: (c.videoUrl as string | null) ?? null,
            x: Number(c.x ?? 0),
            y: Number(c.y ?? 0),
            width: Number(c.width ?? 240),
            height: Number(c.height ?? 160),
            order: Number(c.order ?? 0),
            sectionId: (c.sectionId as string | null) ?? null,
            authorId: String(c.authorId ?? currentUserId),
          })),
        ]);
      }
      alert(`${copiedTo}개 섹션에 카드가 복제되었어요.`);
    } catch (err) {
      console.error(err);
      alert("복제 중 오류가 발생했습니다.");
    } finally {
      setCopying(null);
    }
  }

  function cardMenuItems(card: CardData, isPoolCard: boolean): MenuItem[] {
    const canModify =
      currentRole === "owner" ||
      (currentRole === "editor" && card.authorId === currentUserId);
    const items: MenuItem[] = [];
    if (canModify) {
      items.push({ label: "수정", icon: "✏️", onClick: () => setEditingCard(card) });
    }
    if (canBulkCopy && !isPoolCard) {
      items.push({
        label: copying === card.id ? "복제 중…" : "모든 모둠에 복제",
        icon: "🧬",
        onClick: () => handleCopyToAllGroups(card),
      });
    }
    if (canModify) {
      items.push({
        label: "삭제",
        icon: "🗑️",
        danger: true,
        onClick: () => handleDeleteCard(card.id),
      });
    }
    return items;
  }

  const sectionOptions = sections.map((s) => ({ id: s.id, title: s.title }));

  return (
    <div className="board-canvas-wrap">
      <div className="breakout-header" style={{ padding: "8px 16px" }}>
        <span className="breakout-breadcrumb">
          {boardTitle} · {assignment.templateName} · {assignment.groupCount}모둠
          {" · "}
          {assignment.visibility === "peek-others" ? "👁 모둠 간 열람" : "🔒 자기 모둠만"}
        </span>
      </div>

      {poolSections.length > 0 && (
        <section style={{ padding: "8px 16px 16px" }} aria-label="팀 공용 자료">
          {poolSections.map((s) => {
            const sectionCards = getCardsForSection(s.id);
            return (
              <div key={s.id} className="column" style={{ width: "100%" }}>
                <div className="column-header">
                  <h3 className="column-title">📎 {s.title}</h3>
                  <span className="column-count">{sectionCards.length}</span>
                </div>
                <div className="column-cards" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {sectionCards.map((c) => (
                    <article
                      key={c.id}
                      className="column-card"
                      style={{ backgroundColor: c.color ?? undefined, minWidth: 220 }}
                    >
                      <CardAttachments
                        imageUrl={c.imageUrl}
                        linkUrl={c.linkUrl}
                        linkTitle={c.linkTitle}
                        linkDesc={c.linkDesc}
                        linkImage={c.linkImage}
                        videoUrl={c.videoUrl}
                      />
                      <h4 className="padlet-card-title">{c.title}</h4>
                      <p className="padlet-card-content">{c.content}</p>
                      {canEdit && (
                        <div className="card-ctx-menu">
                          <ContextMenu items={cardMenuItems(c, true)} />
                        </div>
                      )}
                    </article>
                  ))}
                  {sectionCards.length === 0 && (
                    <div className="column-empty">공용 자료를 여기에 추가하세요</div>
                  )}
                </div>
                {canEdit && (
                  <button
                    type="button"
                    className="column-inline-add"
                    onClick={() => setAddForSection(s.id)}
                  >
                    + 자료 추가
                  </button>
                )}
              </div>
            );
          })}
        </section>
      )}

      <div className="columns-board" style={{ alignItems: "flex-start" }}>
        {groupedSections.map(([groupIndex, groupSections]) => (
          <div
            key={groupIndex}
            className="column"
            style={{ border: "2px solid var(--color-border,#ddd)", borderRadius: 8 }}
            aria-label={`모둠 ${groupIndex}`}
          >
            <div className="column-header">
              <h3 className="column-title">모둠 {groupIndex}</h3>
              <span className="column-count">정원 {assignment.groupCapacity}</span>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {groupSections.map((s) => {
                const sectionCards = getCardsForSection(s.id);
                const parsed = parseGroupSection(s.title);
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
                        <article
                          key={c.id}
                          className="column-card"
                          style={{ backgroundColor: c.color ?? undefined }}
                        >
                          <CardAttachments
                            imageUrl={c.imageUrl}
                            linkUrl={c.linkUrl}
                            linkTitle={c.linkTitle}
                            linkDesc={c.linkDesc}
                            linkImage={c.linkImage}
                            videoUrl={c.videoUrl}
                          />
                          <h4 className="padlet-card-title">{c.title}</h4>
                          <p className="padlet-card-content">{c.content}</p>
                          {canEdit && (
                            <div className="card-ctx-menu">
                              <ContextMenu items={cardMenuItems(c, false)} />
                            </div>
                          )}
                        </article>
                      ))}
                      {sectionCards.length === 0 && (
                        <div className="column-empty">아직 카드가 없어요</div>
                      )}
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        className="column-inline-add"
                        onClick={() => setAddForSection(s.id)}
                      >
                        + 카드 추가
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {canEdit && <AddCardButton onAdd={handleAdd} sections={sectionOptions} />}

      {addForSection && (
        <AddCardModal
          onAdd={handleAdd}
          onClose={() => setAddForSection(null)}
          sections={sectionOptions}
          defaultSectionId={addForSection}
        />
      )}

      {editingCard && (
        <EditCardModal
          card={editingCard}
          onSave={handleEditCardSave}
          onClose={() => setEditingCard(null)}
        />
      )}
    </div>
  );
}
