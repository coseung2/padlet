"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AddCardButton } from "./AddCardButton";
import { AddCardModal, type AddCardData } from "./AddCardModal";
import { CardAttachments } from "./CardAttachments";
import { ContextMenu } from "./ContextMenu";
import { EditCardModal } from "./EditCardModal";
import { EditSectionModal } from "./EditSectionModal";
import { ExportModal } from "./ExportModal";
import { CanvaFolderModal } from "./CanvaFolderModal";
import type { CardData } from "./DraggableCard";

type SectionData = {
  id: string;
  title: string;
  order: number;
};

type SortMode = "manual" | "newest" | "oldest" | "title";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "manual", label: "수동" },
  { value: "newest", label: "최신" },
  { value: "oldest", label: "오래된" },
  { value: "title", label: "제목" },
];

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
  const [editingSection, setEditingSection] = useState<SectionData | null>(null);
  const [addForSection, setAddForSection] = useState<string | null>(null);
  const [exportSectionId, setExportSectionId] = useState<string | null>(null);
  const [folderSectionId, setFolderSectionId] = useState<string | null>(null);
  const [organizing, setOrganizing] = useState<string | null>(null);
  const [sortBySection, setSortBySection] = useState<Record<string, SortMode>>({});
  const canEdit = currentRole === "owner" || currentRole === "editor";

  // Cards/sections currently mid-flight in a local mutation. SSE snapshots
  // skip these IDs so an in-progress optimistic update isn't stomped by a
  // server snapshot that hasn't seen the mutation commit yet.
  const pendingCardIds = useRef<Set<string>>(new Set());
  const pendingSectionIds = useRef<Set<string>>(new Set());

  function trackCardMutation<T>(id: string, run: () => Promise<T>): Promise<T> {
    pendingCardIds.current.add(id);
    return run().finally(() => {
      pendingCardIds.current.delete(id);
    });
  }

  function trackSectionMutation<T>(id: string, run: () => Promise<T>): Promise<T> {
    pendingSectionIds.current.add(id);
    return run().finally(() => {
      pendingSectionIds.current.delete(id);
    });
  }

  /* ── Per-column sort persistence ── */
  const sortStorageKey = `aura.columnSort.${boardId}`;
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(sortStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, SortMode>;
      if (parsed && typeof parsed === "object") {
        setSortBySection(parsed);
      }
    } catch {
      // ignore corrupt storage
    }
  }, [sortStorageKey]);

  function setSortFor(sectionId: string, mode: SortMode) {
    setSortBySection((prev) => {
      const next = { ...prev, [sectionId]: mode };
      try {
        window.localStorage.setItem(sortStorageKey, JSON.stringify(next));
      } catch {
        // storage full / disabled — UX still works for the session
      }
      return next;
    });
  }

  /* ── Realtime board stream ── */
  useEffect(() => {
    const es = new EventSource(`/api/boards/${boardId}/stream`);

    function onSnapshot(ev: MessageEvent) {
      try {
        const data = JSON.parse(ev.data) as {
          cards: CardData[];
          sections: SectionData[];
        };
        mergeCards(data.cards);
        mergeSections(data.sections);
      } catch (e) {
        console.error("[board stream snapshot]", e);
      }
    }

    function onForbidden() {
      es.close();
    }

    es.addEventListener("snapshot", onSnapshot as EventListener);
    es.addEventListener("forbidden", onForbidden);

    return () => {
      es.removeEventListener("snapshot", onSnapshot as EventListener);
      es.removeEventListener("forbidden", onForbidden);
      es.close();
    };
    // boardId is the only stable dependency; merge functions read refs/state via setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  function mergeCards(serverCards: CardData[]) {
    setCards((local) => {
      const localById = new Map(local.map((c) => [c.id, c] as const));
      const next: CardData[] = [];
      for (const sc of serverCards) {
        if (pendingCardIds.current.has(sc.id)) {
          // Keep optimistic local copy until the in-flight mutation settles.
          const localCopy = localById.get(sc.id);
          if (localCopy) next.push(localCopy);
          else next.push(sc);
        } else {
          next.push(sc);
        }
      }
      // Keep locally-created cards that the server snapshot doesn't yet see
      // (e.g. POST in flight). These are tracked in pendingCardIds.
      for (const lc of local) {
        if (
          pendingCardIds.current.has(lc.id) &&
          !serverCards.some((sc) => sc.id === lc.id)
        ) {
          next.push(lc);
        }
      }
      return next;
    });
  }

  function mergeSections(serverSections: SectionData[]) {
    setSections((local) => {
      const next: SectionData[] = [];
      const localById = new Map(local.map((s) => [s.id, s] as const));
      for (const ss of serverSections) {
        if (pendingSectionIds.current.has(ss.id)) {
          const localCopy = localById.get(ss.id);
          next.push(localCopy ?? ss);
        } else {
          next.push(ss);
        }
      }
      for (const ls of local) {
        if (
          pendingSectionIds.current.has(ls.id) &&
          !serverSections.some((ss) => ss.id === ls.id)
        ) {
          next.push(ls);
        }
      }
      return next.sort((a, b) => a.order - b.order);
    });
  }

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

  // Group cards by section once per cards/sort change, applying the per-column
  // sort mode. Manual mode falls back to the stored `order` field; the other
  // modes derive from createdAt or title.
  const cardsBySection = useMemo(() => {
    const map = new Map<string, CardData[]>();
    for (const card of cards) {
      const key = card.sectionId ?? "";
      const bucket = map.get(key);
      if (bucket) bucket.push(card);
      else map.set(key, [card]);
    }
    for (const [sectionId, bucket] of map) {
      const mode = sortBySection[sectionId] ?? "manual";
      bucket.sort(comparatorFor(mode));
    }
    return map;
  }, [cards, sortBySection]);

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

    await trackCardMutation(cardId, async () => {
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
    });
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
    await trackCardMutation(id, async () => {
      try {
        const res = await fetch(`/api/cards/${id}`, { method: "DELETE" });
        if (!res.ok) setCards(prev);
      } catch {
        setCards(prev);
      }
    });
  }

  async function handleEditCardSave(updates: Partial<CardData>) {
    if (!editingCard) return;
    const prev = [...cards];
    const cardId = editingCard.id;
    setCards((list) =>
      list.map((c) => (c.id === cardId ? { ...c, ...updates } : c))
    );
    await trackCardMutation(cardId, async () => {
      try {
        const res = await fetch(`/api/cards/${cardId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) setCards(prev);
      } catch {
        setCards(prev);
      }
    });
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

  async function handleEditSectionSave(newTitle: string) {
    if (!editingSection) return;
    const prev = [...sections];
    const sectionId = editingSection.id;
    setSections((list) =>
      list.map((s) => (s.id === sectionId ? { ...s, title: newTitle } : s))
    );
    await trackSectionMutation(sectionId, async () => {
      try {
        const res = await fetch(`/api/sections/${sectionId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });
        if (!res.ok) setSections(prev);
      } catch {
        setSections(prev);
      }
    });
  }

  async function handleDeleteSection(sectionId: string) {
    if (!window.confirm("이 섹션을 삭제할까요? 카드는 섹션 없음 상태로 이동됩니다.")) return;
    const prevSections = [...sections];
    const prevCards = [...cards];
    setSections((list) => list.filter((s) => s.id !== sectionId));
    setCards((list) =>
      list.map((c) => (c.sectionId === sectionId ? { ...c, sectionId: null } : c))
    );
    await trackSectionMutation(sectionId, async () => {
      try {
        const res = await fetch(`/api/sections/${sectionId}`, { method: "DELETE" });
        if (!res.ok) {
          setSections(prevSections);
          setCards(prevCards);
        }
      } catch {
        setSections(prevSections);
        setCards(prevCards);
      }
    });
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
          const sortMode: SortMode = sortBySection[section.id] ?? "manual";

          const menuItems = [
            { label: "수정", icon: "✏️", onClick: () => setEditingSection(section) },
            { label: "Canva에서 가져오기", icon: "📁", onClick: () => setFolderSectionId(section.id) },
            ...(hasCanva
              ? [
                  { label: "PDF 내보내기", icon: "📄", onClick: () => setExportSectionId(section.id) },
                  {
                    label: organizing === section.id ? "정리 중..." : "Canva 폴더로 정리",
                    icon: "📂",
                    onClick: () => handleOrganizeToCanva(section.id),
                  },
                ]
              : []),
            { label: "삭제", icon: "🗑️", danger: true, onClick: () => handleDeleteSection(section.id) },
          ];

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
                <select
                  className={`column-sort-select ${sortMode !== "manual" ? "column-sort-active" : ""}`}
                  aria-label="정렬 기준"
                  value={sortMode}
                  onChange={(e) => setSortFor(section.id, e.target.value as SortMode)}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {canEdit && <ContextMenu items={menuItems} />}
              </div>
              <div className={`column-cards ${overSectionId === section.id ? "column-cards-active" : ""}`}>
                {sectionCards.map((c) => {
                  const canModify =
                    currentRole === "owner" ||
                    (currentRole === "editor" && c.authorId === currentUserId);

                  return (
                    <article
                      key={c.id}
                      className="column-card"
                      style={{ backgroundColor: c.color ?? undefined }}
                      draggable={canEdit}
                      onDragStart={(e) => handleDragStart(e, c.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <CardAttachments imageUrl={c.imageUrl} linkUrl={c.linkUrl} linkTitle={c.linkTitle} linkDesc={c.linkDesc} linkImage={c.linkImage} videoUrl={c.videoUrl} />
                      <h4 className="padlet-card-title">{c.title}</h4>
                      <p className="padlet-card-content">{c.content}</p>
                      {canModify && (
                        <div className="card-ctx-menu">
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

      {editingSection && (
        <EditSectionModal
          title={editingSection.title}
          onSave={handleEditSectionSave}
          onClose={() => setEditingSection(null)}
        />
      )}

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

function comparatorFor(mode: SortMode): (a: CardData, b: CardData) => number {
  switch (mode) {
    case "newest":
      return (a, b) => parseTime(b.createdAt) - parseTime(a.createdAt);
    case "oldest":
      return (a, b) => parseTime(a.createdAt) - parseTime(b.createdAt);
    case "title":
      return (a, b) => a.title.localeCompare(b.title, "ko");
    case "manual":
    default:
      return (a, b) => a.order - b.order;
  }
}

function parseTime(value: string | undefined): number {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}
