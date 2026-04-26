"use client";

import { useEffect, type MutableRefObject } from "react";
import type { CardData } from "../DraggableCard";

export type StreamSection = {
  id: string;
  title: string;
  order: number;
  accessToken?: string | null;
  sortMode?: string | null;
};

type Options = {
  boardId: string;
  pendingCardIds: MutableRefObject<Set<string>>;
  setCards: React.Dispatch<React.SetStateAction<CardData[]>>;
  setSections: React.Dispatch<React.SetStateAction<StreamSection[]>>;
};

/** Subscribes to /api/boards/:id/stream and merges snapshot payloads into
 *  local state. Card merges respect pendingCardIds — an optimistic mutation
 *  in flight keeps the local copy until it settles. Section snapshots are
 *  authoritative (section mutations go through dedicated panels). */
export function useBoardStream({
  boardId,
  pendingCardIds,
  setCards,
  setSections,
}: Options) {
  useEffect(() => {
    const es = new EventSource(`/api/boards/${boardId}/stream`);

    function onSnapshot(ev: MessageEvent) {
      try {
        const data = JSON.parse(ev.data) as {
          cards: CardData[];
          sections: StreamSection[];
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

    function mergeCards(serverCards: CardData[]) {
      setCards((local) => {
        const localById = new Map(local.map((c) => [c.id, c] as const));
        const next: CardData[] = [];
        for (const sc of serverCards) {
          if (pendingCardIds.current.has(sc.id)) {
            const localCopy = localById.get(sc.id);
            if (localCopy) next.push(localCopy);
            else next.push(sc);
          } else {
            next.push(sc);
          }
        }
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

    function mergeSections(serverSections: StreamSection[]) {
      setSections(() =>
        [...serverSections].sort((a, b) => a.order - b.order)
      );
    }

    es.addEventListener("snapshot", onSnapshot as EventListener);
    es.addEventListener("forbidden", onForbidden);

    return () => {
      es.removeEventListener("snapshot", onSnapshot as EventListener);
      es.removeEventListener("forbidden", onForbidden);
      es.close();
    };
    // boardId is the only stable dependency; merges read refs via closures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);
}
