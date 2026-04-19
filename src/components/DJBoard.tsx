"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CardData } from "./DraggableCard";
import { DJNowPlayingHeader } from "./dj/DJNowPlayingHeader";
import { DJQueueList } from "./dj/DJQueueList";
import { DJSubmitForm } from "./dj/DJSubmitForm";
import { DJEmptyState } from "./dj/DJEmptyState";

type Props = {
  boardId: string;
  boardTitle: string;
  initialCards: CardData[];
  currentRole: "owner" | "editor" | "viewer";
  currentUserId: string | null;
  currentStudentId: string | null;
};

export function DJBoard({
  boardId,
  boardTitle,
  initialCards,
  currentRole,
  currentStudentId,
}: Props) {
  const [cards, setCards] = useState<CardData[]>(initialCards);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canControl = currentRole === "owner" || currentRole === "editor";

  // Tracks cards currently mid-flight so SSE snapshots don't stomp optimistic
  // mutations. Same pattern as ColumnsBoard.
  const pendingCardIds = useRef<Set<string>>(new Set());

  function trackMutation<T>(id: string, run: () => Promise<T>): Promise<T> {
    pendingCardIds.current.add(id);
    return run().finally(() => {
      pendingCardIds.current.delete(id);
    });
  }

  // Live SSE stream
  useEffect(() => {
    const es = new EventSource(`/api/boards/${boardId}/stream`);

    function onSnapshot(ev: MessageEvent) {
      try {
        const data = JSON.parse(ev.data) as { cards: CardData[] };
        setCards((local) => {
          const localById = new Map(local.map((c) => [c.id, c] as const));
          const next: CardData[] = [];
          for (const sc of data.cards) {
            if (pendingCardIds.current.has(sc.id)) {
              const l = localById.get(sc.id);
              next.push(l ?? sc);
            } else {
              next.push(sc);
            }
          }
          for (const l of local) {
            if (
              pendingCardIds.current.has(l.id) &&
              !data.cards.some((sc) => sc.id === l.id)
            ) {
              next.push(l);
            }
          }
          return next;
        });
      } catch (e) {
        console.error("[dj stream snapshot]", e);
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
    // boardId stable — merge fn uses setCards which reads current via updater.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  // Filter + sort
  const queueCards = useMemo(() => {
    // Non-DJ view: hide rejected items entirely.
    const visible = cards.filter(
      (c) =>
        c.queueStatus &&
        (canControl || c.queueStatus !== "rejected")
    );
    return [...visible].sort((a, b) => a.order - b.order);
  }, [cards, canControl]);

  const playedIds = new Set(
    queueCards.filter((c) => c.queueStatus === "played").map((c) => c.id)
  );
  const nowPlaying = useMemo(() => {
    // First non-played, non-rejected, approved item. If none, null.
    return queueCards.find(
      (c) => c.queueStatus === "approved" && !playedIds.has(c.id)
    ) ?? null;
    // playedIds derived from queueCards already, deps only need queueCards
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueCards]);

  const upNext = queueCards.filter((c) => c.id !== nowPlaying?.id);

  async function handleSubmit(youtubeUrl: string) {
    setError(null);
    const res = await fetch(`/api/boards/${boardId}/queue`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ youtubeUrl }),
    });
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({ error: "제출 실패" }))).error;
      setError(typeof msg === "string" ? msg : "제출 실패");
      return;
    }
    const { card } = (await res.json()) as { card: CardData };
    setCards((prev) => [...prev, card]);
    setSubmitOpen(false);
  }

  async function handleStatus(
    cardId: string,
    status: "approved" | "rejected" | "played"
  ) {
    const prev = cards;
    setCards((list) =>
      list.map((c) => (c.id === cardId ? { ...c, queueStatus: status } : c))
    );
    await trackMutation(cardId, async () => {
      const res = await fetch(`/api/boards/${boardId}/queue/${cardId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) setCards(prev);
    });
  }

  async function handleDelete(cardId: string) {
    if (!window.confirm("이 곡을 삭제할까요?")) return;
    const prev = cards;
    setCards((list) => list.filter((c) => c.id !== cardId));
    await trackMutation(cardId, async () => {
      const res = await fetch(`/api/boards/${boardId}/queue/${cardId}`, {
        method: "DELETE",
      });
      if (!res.ok) setCards(prev);
    });
  }

  async function handleReorder(cardId: string, newOrder: number) {
    const prev = cards;
    setCards((list) =>
      list.map((c) => (c.id === cardId ? { ...c, order: newOrder } : c))
    );
    await trackMutation(cardId, async () => {
      const res = await fetch(
        `/api/boards/${boardId}/queue/${cardId}/move`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ order: newOrder }),
        }
      );
      if (!res.ok) setCards(prev);
    });
  }

  async function handleNextTrack() {
    if (!nowPlaying) return;
    await handleStatus(nowPlaying.id, "played");
  }

  const isEmpty = queueCards.length === 0;

  return (
    <main className="dj-board">
      <header className="dj-board-header">
        <h1>🎧 {boardTitle}</h1>
        <div className="dj-board-meta">
          <span className="dj-count">{queueCards.length}곡</span>
        </div>
      </header>

      {nowPlaying && (
        <DJNowPlayingHeader
          card={nowPlaying}
          canControl={canControl}
          onNext={handleNextTrack}
        />
      )}

      {isEmpty ? (
        <DJEmptyState canControl={canControl} onAdd={() => setSubmitOpen(true)} />
      ) : (
        <DJQueueList
          cards={upNext}
          canControl={canControl}
          currentStudentId={currentStudentId}
          onStatus={handleStatus}
          onDelete={handleDelete}
          onReorder={handleReorder}
        />
      )}

      <div className="dj-board-footer">
        <button
          type="button"
          className="dj-submit-btn"
          onClick={() => setSubmitOpen(true)}
        >
          + 곡 신청
        </button>
      </div>

      {submitOpen && (
        <DJSubmitForm
          error={error}
          onSubmit={handleSubmit}
          onClose={() => {
            setSubmitOpen(false);
            setError(null);
          }}
        />
      )}
    </main>
  );
}
