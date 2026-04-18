"use client";

// Library list — past quizzes the teacher owns. Used inside
// QuizGenerateModal's "과거 퀴즈" tab. Selection is single-item (radio
// semantics); the parent decides what "reuse" does with the chosen id.

import { useEffect, useState } from "react";
import type { QuizLibraryItem } from "@/types/quiz";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface QuizLibraryListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function QuizLibraryList({ selectedId, onSelect }: QuizLibraryListProps) {
  const [items, setItems] = useState<QuizLibraryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  async function load(nextCursor: string | null) {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/quiz/library", window.location.origin);
      if (nextCursor) url.searchParams.set("cursor", nextCursor);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        items: QuizLibraryItem[];
        nextCursor: string | null;
      };
      setItems((prev) => (nextCursor ? [...prev, ...data.items] : data.items));
      setCursor(data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }

  useEffect(() => {
    load(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!initialized && loading) {
    return <div className="quiz-library-empty">불러오는 중...</div>;
  }

  if (error) {
    return (
      <div className="quiz-library-error" role="alert">
        ⚠ 불러오지 못했습니다
        <button
          type="button"
          className="quiz-btn quiz-btn-secondary"
          onClick={() => load(null)}
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="quiz-library-empty">
        <div className="quiz-library-empty-icon">📚</div>
        <div>만든 퀴즈가 없습니다</div>
      </div>
    );
  }

  return (
    <div className="quiz-library">
      <ul className="quiz-library-list" role="radiogroup" aria-label="과거 퀴즈 목록">
        {items.map((it) => {
          const checked = selectedId === it.id;
          return (
            <li key={it.id}>
              <label
                className={`quiz-library-item${checked ? " is-active" : ""}`}
              >
                <input
                  type="radio"
                  name="quiz-library"
                  checked={checked}
                  onChange={() => onSelect(it.id)}
                />
                <div className="quiz-library-item-main">
                  <div className="quiz-library-item-title">
                    {it.title || "제목 없음"} ({it.questionCount}문항)
                  </div>
                  <div className="quiz-library-item-meta">
                    {formatDate(it.createdAt)}
                  </div>
                </div>
              </label>
            </li>
          );
        })}
      </ul>
      {cursor && (
        <button
          type="button"
          className="quiz-btn quiz-btn-secondary quiz-library-more"
          onClick={() => load(cursor)}
          disabled={loading}
        >
          {loading ? "불러오는 중..." : "더 보기"}
        </button>
      )}
    </div>
  );
}
