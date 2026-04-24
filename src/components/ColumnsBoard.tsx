"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AddCardButton } from "./AddCardButton";
import { AddCardModal, type AddCardData } from "./AddCardModal";
import { CardBody } from "./cards/CardBody";
import { CardDetailModal } from "./cards/CardDetailModal";
import { CardAuthorEditor, type SavedAuthor } from "./cards/CardAuthorEditor";
import { ContextMenu } from "./ContextMenu";
import { ColumnMenu } from "./columns/ColumnMenu";
import { EditCardModal } from "./EditCardModal";
import { ExportModal } from "./ExportModal";
import { CanvaFolderModal } from "./CanvaFolderModal";
import { SectionActionsPanel } from "./SectionActionsPanel";
import type { CardData } from "./DraggableCard";

type SortMode = "manual" | "newest" | "oldest" | "title";

type SectionData = {
  id: string;
  title: string;
  order: number;
  accessToken?: string | null;
  /** shared-column-sort (2026-04-20): 교사가 고른 칼럼별 정렬 모드.
   *  null은 "manual"로 해석. SSE를 통해 학생에게도 실시간 전파됨. */
  sortMode?: string | null;
};

function toSortMode(v: string | null | undefined): SortMode {
  return v === "newest" || v === "oldest" || v === "title" ? v : "manual";
}


type PanelTab = "rename" | "delete";

type Props = {
  boardId: string;
  initialCards: CardData[];
  initialSections: SectionData[];
  currentUserId: string;
  currentRole: "owner" | "editor" | "viewer";
  isStudentViewer?: boolean;
  /** Board's classroomId — enables the CardAuthorEditor roster picker. */
  classroomId?: string | null;
};

export function ColumnsBoard({
  boardId,
  initialCards,
  initialSections,
  currentUserId,
  currentRole,
  isStudentViewer,
  classroomId,
}: Props) {
  const [cards, setCards] = useState<CardData[]>(initialCards);
  const [authorEditCard, setAuthorEditCard] = useState<CardData | null>(null);
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
  // Students can add cards to their classroom's columns board. Section
  // membership rules (sectionId must belong to this board) are enforced
  // server-side by /api/cards + the external-cards sectionId guard.
  const canAddCard = canEdit || !!isStudentViewer;

  // Cards currently mid-flight in a local mutation. SSE snapshots skip
  // these IDs so an in-progress optimistic update isn't stomped by a
  // server snapshot that hasn't seen the mutation commit yet.
  const pendingCardIds = useRef<Set<string>>(new Set());

  function trackCardMutation<T>(id: string, run: () => Promise<T>): Promise<T> {
    pendingCardIds.current.add(id);
    return run().finally(() => {
      pendingCardIds.current.delete(id);
    });
  }

  /* ── Per-column sort persistence (shared-column-sort 2026-04-20) ──
     localStorage 단독이 아닌 Section.sortMode 서버 값을 단일 소스로 사용.
     교사가 드롭다운을 바꾸면 PATCH /api/sections/:id로 저장 → SSE
     snapshot으로 학생 화면도 동기화. 학생은 드롭다운이 disabled라 읽기만. */
  async function setSortFor(sectionId: string, mode: SortMode) {
    if (!canEdit) return; // 권한 없는 경로는 UI-level에서도 단락.
    const prev = sections;
    // Optimistic — SSE 도착 전 즉시 반영.
    setSections((list) =>
      list.map((s) => (s.id === sectionId ? { ...s, sortMode: mode } : s))
    );
    try {
      const res = await fetch(`/api/sections/${sectionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sortMode: mode }),
      });
      if (!res.ok) {
        setSections(prev);
        alert(`정렬 저장 실패: ${await res.text().catch(() => "")}`);
      }
    } catch (e) {
      setSections(prev);
      console.error("[setSortFor]", e);
    }
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
    // Section mutations (rename/delete/reorder) go through dedicated panels
    // that finalize server state before their success callback updates local
    // state, so snapshots can take authoritative server-owned values directly.
    setSections(() => [...serverSections].sort((a, b) => a.order - b.order));
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
  // shared-column-sort: sortMode는 sections(서버) 기반. sections 변경 시
  // 정렬 재계산 트리거되도록 의존성에 포함.
  const sortModeById = useMemo(() => {
    const map: Record<string, SortMode> = {};
    for (const s of sections) map[s.id] = toSortMode(s.sortMode);
    return map;
  }, [sections]);

  const cardsBySection = useMemo(() => {
    const map = new Map<string, CardData[]>();
    for (const card of cards) {
      const key = card.sectionId ?? "";
      const bucket = map.get(key);
      if (bucket) bucket.push(card);
      else map.set(key, [card]);
    }
    for (const [sectionId, bucket] of map) {
      const mode = sortModeById[sectionId] ?? "manual";
      bucket.sort(comparatorFor(mode));
    }
    return map;
  }, [cards, sortModeById]);

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
    setDraggingSectionId(null);
    // Section drag takes priority — distinguished by the mime key set
    // in the column-header's onDragStart.
    const sectionId = e.dataTransfer.getData("application/section-id");
    if (sectionId) {
      moveSectionTo(sectionId, targetSectionId);
      return;
    }
    const cardId = e.dataTransfer.getData("application/card-id");
    if (cardId) moveCard(cardId, targetSectionId);
  }

  /* ── Section reorder (drag-drop) ──
   *
   * Column headers are HTML5-draggable. Dropping section A onto
   * section B's column moves A to B's position in the list. All
   * affected sections are re-indexed 0..N-1 locally and PATCH'd in
   * parallel. Optimistic state; on failure we roll back.
   *
   * Distinguishable from card drag via the `application/section-id`
   * mime key — card drag uses `application/card-id`. */
  async function moveSectionTo(sectionId: string, targetSectionId: string) {
    if (sectionId === targetSectionId) return;
    const fromIdx = sections.findIndex((s) => s.id === sectionId);
    const toIdx = sections.findIndex((s) => s.id === targetSectionId);
    if (fromIdx === -1 || toIdx === -1) return;

    const prev = sections;
    const next = [...sections];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved!);
    const normalised = next.map((s, i) => ({ ...s, order: i }));
    setSections(normalised);

    // Every section whose index actually changed gets PATCH'd. For a
    // move of length K positions this is ≤K+1 rows — still cheap on
    // typical 3-8 column boards.
    const changed = normalised.filter((s, i) => prev[i]?.id !== s.id);
    try {
      const responses = await Promise.all(
        changed.map((s) =>
          fetch(`/api/sections/${s.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ order: s.order }),
          })
        )
      );
      if (responses.some((r) => !r.ok)) {
        console.error("섹션 순서 변경 실패");
        setSections(prev);
      }
    } catch (err) {
      console.error(err);
      setSections(prev);
    }
  }

  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);

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
          linkUrl: data.linkUrl || null,
          linkTitle: data.linkTitle || null,
          linkDesc: data.linkDesc || null,
          linkImage: data.linkImage || null,
          attachments: data.attachments,
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

  // 학생-시드: 학급 학생을 출석번호 순으로 섹션화. classroom-linked 보드에서만
  // 노출되며 1회성 시드라 현재 섹션 뒤에 append. 명시적 확인 모달 후 호출.
  const [seedingStudents, setSeedingStudents] = useState(false);
  async function handleSeedFromStudents() {
    if (seedingStudents) return;
    if (!window.confirm("학급 학생 명단으로 칼럼을 추가할까요?")) return;
    setSeedingStudents(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/sections/seed-students`, {
        method: "POST",
      });
      if (!res.ok) {
        const msg = (await res.json().catch(() => ({}))).error;
        alert(typeof msg === "string" ? msg : "칼럼 추가 실패");
        return;
      }
      const { sections: created } = (await res.json()) as {
        sections: SectionData[];
      };
      setSections((prev) => [...prev, ...created]);
    } finally {
      setSeedingStudents(false);
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
    <div className="board-canvas-wrap board-canvas-wrap-columns">
      {/* Export mode toolbar */}
      <div className="columns-board">
        {sections.map((section) => {
          const sectionCards = getCardsForSection(section.id);
          const hasCanva = sectionCards.some(
            (c) => c.linkUrl && (c.linkUrl.includes("canva.link") || c.linkUrl.includes("canva.com"))
          );
          const sortMode: SortMode = sortModeById[section.id] ?? "manual";

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
              <div
                className={`column-header ${
                  canEdit ? "is-section-draggable" : ""
                } ${
                  draggingSectionId === section.id ? "is-section-dragging" : ""
                }`}
                draggable={canEdit}
                onDragStart={(e) => {
                  if (!canEdit) return;
                  e.dataTransfer.setData("application/section-id", section.id);
                  e.dataTransfer.effectAllowed = "move";
                  setDraggingSectionId(section.id);
                }}
                onDragEnd={() => setDraggingSectionId(null)}
              >
                <h3 className="column-title">{section.title}</h3>
                <span className="column-count">{sectionCards.length}</span>
                {(canEdit || menuItems.length > 0) && (
                  <ColumnMenu
                    sortMode={sortMode}
                    canSort={canEdit}
                    onSetSort={(mode) => setSortFor(section.id, mode)}
                    actions={menuItems}
                  />
                )}
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
                              // 교사(owner/editor) + 학생 자기 카드 모두에게 노출.
                              // /api/cards/:id/authors는 canEditCard로 게이트하며
                              // 학생 own-card를 이미 허용한다(student-author-edit
                              // 2026-04-20). context menu에서도 조건을 맞춤.
                              ...(canEdit || c.studentAuthorId === currentUserId
                                ? [
                                    {
                                      label: "작성자 지정",
                                      icon: "👥",
                                      onClick: () => setAuthorEditCard(c),
                                    },
                                  ]
                                : []),
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
          <div className="column-add-stack">
            <button
              type="button"
              className="column-add-btn"
              onClick={handleAddSection}
            >
              + 섹션 추가
            </button>
            {classroomId && (
              <button
                type="button"
                className="column-add-btn column-add-btn-seed"
                onClick={handleSeedFromStudents}
                disabled={seedingStudents}
                title="학급 학생 명단으로 칼럼을 한 번에 추가"
              >
                {seedingStudents ? "추가 중…" : "🧑 학생 이름으로 칼럼 만들기"}
              </button>
            )}
          </div>
        )}
      </div>

      {canAddCard && <AddCardButton onAdd={handleAdd} sections={sectionOptions} />}

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

      {authorEditCard && (
        <CardAuthorEditor
          cardId={authorEditCard.id}
          classroomId={classroomId ?? null}
          initialAuthors={(authorEditCard.authors ?? []).map((a) => ({
            id: a.id,
            studentId: a.studentId,
            displayName: a.displayName,
            order: a.order,
          }))}
          onSaved={(authors: SavedAuthor[]) => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === authorEditCard.id
                  ? {
                      ...c,
                      authors,
                      studentAuthorId: authors[0]?.studentId ?? null,
                      externalAuthorName:
                        authors.length > 0
                          ? authors
                              .slice(0, 3)
                              .map((a) => a.displayName)
                              .join(", ") +
                            (authors.length > 3 ? ` 외 ${authors.length - 1}명` : "")
                          : null,
                    }
                  : c
              )
            );
          }}
          onClose={() => setAuthorEditCard(null)}
        />
      )}

      <CardDetailModal
        card={openCard}
        onClose={() => setOpenCard(null)}
        // 상세 모달 좌/우 네비게이션이 보드 전체 카드를 순환하지 않고 같은
        // 섹션(칼럼) 내 카드만, 화면에 보이는 정렬 순서대로 순환하도록 필터.
        // sortModeById를 그대로 반영해 "교사 정렬 = 학생 네비게이션 순서"
        // 일관성 확보. 삭제된 카드는 cards에서 빠지므로 자동 반영.
        cards={
          openCard
            ? cards
                .filter((c) => c.sectionId === openCard.sectionId)
                .sort(comparatorFor(sortModeById[openCard.sectionId ?? ""] ?? "manual"))
            : cards
        }
        onChange={setOpenCard}
        onEditAuthors={(c) => setAuthorEditCard(c)}
        canEditAuthors={(c) => canEdit || c.studentAuthorId === currentUserId}
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
