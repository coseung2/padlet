"use client";

import { useMemo, useState } from "react";
import { AddCardButton } from "./AddCardButton";
import { AddCardModal, type AddCardData } from "./AddCardModal";
import { CardBody } from "./cards/CardBody";
import { CardDetailModal } from "./cards/CardDetailModal";
import { ContextMenu } from "./ContextMenu";
import { EditCardModal } from "./EditCardModal";
import { ExportModal } from "./ExportModal";
import { CanvaFolderModal } from "./CanvaFolderModal";
import { SectionActionsPanel } from "./SectionActionsPanel";
import type { CardData } from "./DraggableCard";

type SectionData = {
  id: string;
  title: string;
  order: number;
  accessToken?: string | null;
};

type PanelTab = "rename" | "delete";

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
  const [editingCard, setEditingCard] = useState<CardData | null>(null);
  const [openCard, setOpenCard] = useState<CardData | null>(null);
  const [panelState, setPanelState] = useState<{
    sectionId: string;
    tab: PanelTab;
  } | null>(null);
  const [addForSection, setAddForSection] = useState<string | null>(null);
  const [exportSectionId, setExportSectionId] = useState<string | null>(null);
  const [folderSectionId, setFolderSectionId] = useState<string | null>(null);
  const [organizing, setOrganizing] = useState<string | null>(null);
  const canEdit = currentRole === "owner" || currentRole === "editor";

  async function handleOrganizeToCanva(sectionId: string) {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    const sectionCards = getCardsForSection(sectionId);
    const canvaUrls = sectionCards
      .filter((c) => c.linkUrl && (c.linkUrl.includes("canva.link") || c.linkUrl.includes("canva.com")))
      .map((c) => c.linkUrl!);

    if (canvaUrls.length === 0) {
      alert("이 섹션에 Canva 링크가 없습니다.");
      return;
    }

    if (!window.confirm(
      `"${section.title}" 폴더를 Canva에 생성하고\n${canvaUrls.length}개 디자인을 이동할까요?`
    )) return;

    setOrganizing(sectionId);
    try {
      const res = await fetch("/api/canva/organize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sectionTitle: section.title, canvaUrls }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "canva_not_connected") {
          if (window.confirm("Canva 계정 연결이 필요합니다. 지금 연결할까요?")) {
            window.location.href = "/api/auth/canva";
          }
        } else {
          alert(`정리 실패: ${data.error}`);
        }
        setOrganizing(null);
        return;
      }

      const data = await res.json();
      alert(data.summary);
    } catch (err) {
      console.error(err);
      alert("Canva 폴더 정리 중 오류가 발생했습니다.");
    }
    setOrganizing(null);
  }

  async function handleImportFromCanva(
    sectionId: string,
    designs: { id: string; title: string; thumbnail?: string }[]
  ) {
    for (const d of designs) {
      try {
        const viewUrl = `https://www.canva.com/design/${d.id}/view`;
        const res = await fetch("/api/cards", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            boardId,
            title: d.title,
            content: "",
            linkUrl: viewUrl,
            linkTitle: d.title,
            linkImage: d.thumbnail || null,
            x: 0, y: 0,
            order: getCardsForSection(sectionId).length,
            sectionId,
          }),
        });
        if (res.ok) {
          const { card } = await res.json();
          setCards((prev) => [...prev, card]);
        }
      } catch (err) {
        console.error(err);
      }
    }
    setFolderSectionId(null);
  }

  // Group cards by section once per cards change, then O(1) lookup per section.
  // Render path previously filtered + sorted the whole card list 8×, turning
  // a 100-card board into 800 filter/sort ops per render.
  const cardsBySection = useMemo(() => {
    const map = new Map<string, CardData[]>();
    const sorted = [...cards].sort((a, b) => a.order - b.order);
    for (const card of sorted) {
      const key = card.sectionId ?? "";
      const bucket = map.get(key);
      if (bucket) bucket.push(card);
      else map.set(key, [card]);
    }
    return map;
  }, [cards]);

  function getCardsForSection(sectionId: string): CardData[] {
    return cardsBySection.get(sectionId) ?? [];
  }

  /* ── Card drag/drop ── */
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
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add("is-dragging");
    }
  }

  function handleDragEnd(e: React.DragEvent) {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove("is-dragging");
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
    if (cardId) moveCard(cardId, targetSectionId);
  }

  /* ── Add card (shared by FAB and per-column buttons) ── */
  async function handleAdd(data: AddCardData) {
    const targetSection = data.sectionId ?? sections[0]?.id ?? null;
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

  /* ── Card actions ── */
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

  async function handleDuplicateCard(card: CardData) {
    try {
      const res = await fetch(`/api/cards`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          boardId,
          title: `${card.title} (복사)`,
          content: card.content,
          imageUrl: card.imageUrl || null,
          linkUrl: card.linkUrl || null,
          videoUrl: card.videoUrl || null,
          color: card.color || null,
          x: 0, y: 0,
          order: getCardsForSection(card.sectionId ?? "").length,
          sectionId: card.sectionId,
        }),
      });
      if (res.ok) {
        const { card: newCard } = await res.json();
        setCards((prev) => [...prev, newCard]);
      }
    } catch (err) {
      console.error(err);
    }
  }

  /* ── Section actions ── */
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

  function handleSectionRenamed(sectionId: string, newTitle: string) {
    setSections((list) =>
      list.map((s) => (s.id === sectionId ? { ...s, title: newTitle } : s))
    );
  }

  function handleSectionDeleted(sectionId: string) {
    setSections((list) => list.filter((s) => s.id !== sectionId));
    setCards((list) =>
      list.map((c) => (c.sectionId === sectionId ? { ...c, sectionId: null } : c))
    );
    setPanelState(null);
  }

  const sectionOptions = sections.map((s) => ({ id: s.id, title: s.title }));

  return (
    <div className="board-canvas-wrap">
      {/* Export mode toolbar */}
      <div className="columns-board">
        {sections.map((section) => {
          const sectionCards = getCardsForSection(section.id);
          const hasCanva = sectionCards.some(
            (c) => c.linkUrl && (c.linkUrl.includes("canva.link") || c.linkUrl.includes("canva.com"))
          );

          // 섹션 헤더 ⋯ 한 개로 rename/delete + Canva 옵션 통합.
          // 공유(브레이크아웃) 진입점은 보드 헤더의 ⚙ → BoardSettingsPanel 로 이동.
          const menuItems = canEdit
            ? [
                {
                  label: "이름 변경",
                  icon: "✏️",
                  onClick: () =>
                    setPanelState({ sectionId: section.id, tab: "rename" }),
                },
                {
                  label: "Canva에서 가져오기",
                  icon: "📁",
                  onClick: () => setFolderSectionId(section.id),
                },
                ...(hasCanva
                  ? [
                      {
                        label: "PDF 내보내기",
                        icon: "📄",
                        onClick: () => setExportSectionId(section.id),
                      },
                      {
                        label:
                          organizing === section.id
                            ? "정리 중..."
                            : "Canva 폴더로 정리",
                        icon: "📂",
                        onClick: () => handleOrganizeToCanva(section.id),
                      },
                    ]
                  : []),
                {
                  label: "섹션 삭제",
                  icon: "🗑️",
                  danger: true,
                  onClick: () =>
                    setPanelState({ sectionId: section.id, tab: "delete" }),
                },
              ]
            : [];

          return (
            <div
              key={section.id}
              className="column"
              onDragOver={handleDragOver}
              onDragEnter={() => setOverSectionId(section.id)}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setOverSectionId(null);
                }
              }}
              onDrop={(e) => handleDrop(e, section.id)}
            >
              <div className="column-header">
                <h3 className="column-title">{section.title}</h3>
                <span className="column-count">{sectionCards.length}</span>
                {menuItems.length > 0 && <ContextMenu items={menuItems} />}
              </div>
              <div className={`column-cards ${overSectionId === section.id ? "column-cards-active" : ""}`}>
                {sectionCards.map((c) => {
                  const canModify =
                    currentRole === "owner" ||
                    (currentRole === "editor" && c.authorId === currentUserId) ||
                    // Student-authored card — the author student (role=viewer
                    // in the fallback session) can still manage their own
                    // publish. Matches /api/cards/:id student-auth path.
                    c.studentAuthorId === currentUserId;

                  return (
                    <article
                      key={c.id}
                      className="column-card is-clickable"
                      style={{ backgroundColor: c.color ?? undefined }}
                      draggable={canEdit}
                      onDragStart={(e) => handleDragStart(e, c.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setOpenCard(c)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setOpenCard(c);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                    >
                      <CardBody card={c} titleAs="h4" />
                      {canModify && (
                        <div className="card-ctx-menu" onClick={(e) => e.stopPropagation()}>
                          <ContextMenu
                            items={[
                              { label: "수정", icon: "✏️", onClick: () => setEditingCard(c) },
                              { label: "복제", icon: "📋", onClick: () => handleDuplicateCard(c) },
                              { label: "삭제", icon: "🗑️", danger: true, onClick: () => handleDeleteCard(c.id) },
                            ]}
                          />
                        </div>
                      )}
                    </article>
                  );
                })}
                {sectionCards.length === 0 && (
                  <div className="column-empty">카드를 여기로 끌어오세요</div>
                )}
              </div>
              {canEdit && (
                <button
                  type="button"
                  className="column-inline-add"
                  onClick={() => setAddForSection(section.id)}
                >
                  + 카드 추가
                </button>
              )}
            </div>
          );
        })}

        {canEdit && (
          <button type="button" className="column-add-btn" onClick={handleAddSection}>
            + 섹션 추가
          </button>
        )}
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

      <CardDetailModal
        card={openCard}
        onClose={() => setOpenCard(null)}
        cards={cards}
        onChange={setOpenCard}
      />

      {panelState && (() => {
        const section = sections.find((s) => s.id === panelState.sectionId);
        if (!section) return null;
        return (
          <SectionActionsPanel
            open={true}
            onClose={() => setPanelState(null)}
            section={{
              id: section.id,
              title: section.title,
            }}
            currentRole={currentRole}
            defaultTab={panelState.tab}
            onRenamed={(t) => handleSectionRenamed(section.id, t)}
            onDeleted={() => handleSectionDeleted(section.id)}
          />
        );
      })()}

      {folderSectionId && (
        <CanvaFolderModal
          sectionTitle={sections.find((s) => s.id === folderSectionId)?.title ?? ""}
          onImport={(designs) => handleImportFromCanva(folderSectionId, designs)}
          onClose={() => setFolderSectionId(null)}
        />
      )}

      {exportSectionId && (
        <ExportModal
          sectionTitle={sections.find((s) => s.id === exportSectionId)?.title ?? ""}
          cards={getCardsForSection(exportSectionId)}
          onClose={() => setExportSectionId(null)}
        />
      )}
    </div>
  );
}
