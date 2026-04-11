"use client";

import { useState } from "react";
import Link from "next/link";
import { CreateBoardModal } from "./CreateBoardModal";

type BoardItem = {
  id: string;
  slug: string;
  title: string;
  layout: string;
  cardCount: number;
  memberCount: number;
  role: string;
};

const LAYOUT_EMOJI: Record<string, string> = {
  freeform: "🎯",
  grid: "🔲",
  stream: "📜",
  columns: "📊",
  assignment: "📋",
  quiz: "🎮",
};

const LAYOUT_LABEL: Record<string, string> = {
  freeform: "자유 배치",
  grid: "그리드",
  stream: "스트림",
  columns: "칼럼",
  assignment: "과제 배부",
  quiz: "퀴즈",
};

type Props = {
  boards: BoardItem[];
};

export function Dashboard({ boards }: Props) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <div className="dashboard-classroom-row">
        <a href="/classroom" className="dashboard-classroom-link">학급 관리 →</a>
      </div>
      <div className="board-grid">
        {/* New board card — first position */}
        <button
          type="button"
          className="board-grid-card board-grid-new"
          onClick={() => setShowCreate(true)}
        >
          <div className="board-grid-new-icon">+</div>
          <span className="board-grid-new-label">새 보드 만들기</span>
        </button>

        {boards.map((b) => (
          <Link key={b.id} href={`/board/${b.slug}`} className="board-grid-card">
            <div className="board-grid-emoji">{LAYOUT_EMOJI[b.layout] ?? "📋"}</div>
            <div className="board-grid-title">{b.title}</div>
            <div className="board-grid-meta">
              {LAYOUT_LABEL[b.layout] ?? b.layout}
            </div>
          </Link>
        ))}
      </div>

      {showCreate && <CreateBoardModal onClose={() => setShowCreate(false)} />}
    </>
  );
}
