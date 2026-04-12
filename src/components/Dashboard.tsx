"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

type ClassroomItem = {
  id: string;
  name: string;
  studentCount: number;
};

type Props = {
  boards: BoardItem[];
  classrooms: ClassroomItem[];
};

export function Dashboard({ boards, classrooms }: Props) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  async function handleDelete(boardId: string) {
    if (!confirm("이 보드를 삭제하시겠습니까? 모든 카드가 함께 삭제됩니다.")) return;
    try {
      const res = await fetch(`/api/boards/${boardId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        alert(`삭제 실패: ${await res.text()}`);
      }
    } catch (err) {
      console.error(err);
    }
    setMenuOpen(null);
  }

  async function handleDuplicate(boardId: string) {
    try {
      const res = await fetch(`/api/boards/${boardId}/duplicate`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert(`복제 실패: ${await res.text()}`);
      }
    } catch (err) {
      console.error(err);
    }
    setMenuOpen(null);
  }

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
          <div key={b.id} className={`board-grid-card${menuOpen === b.id ? " board-grid-card--menu-open" : ""}`} style={{ position: "relative", padding: 0 }}>
            <Link
              href={`/board/${b.slug}`}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "20px 12px 12px", textDecoration: "none", color: "inherit", flex: 1 }}
            >
              <div className="board-grid-emoji">{LAYOUT_EMOJI[b.layout] ?? "📋"}</div>
              <div className="board-grid-title">{b.title}</div>
              <div className="board-grid-meta">
                {LAYOUT_LABEL[b.layout] ?? b.layout}
              </div>
            </Link>
            {b.role === "owner" && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen(menuOpen === b.id ? null : b.id);
                }}
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  background: "none",
                  border: "none",
                  borderRadius: 4,
                  width: 26,
                  height: 26,
                  cursor: "pointer",
                  fontSize: 16,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-muted, #94a3b8)",
                  opacity: 0.6,
                }}
                title="보드 관리"
              >
                ···
              </button>
            )}
            {menuOpen === b.id && (
              <div
                style={{
                  position: "absolute",
                  top: 34,
                  right: 6,
                  background: "var(--color-surface, #fff)",
                  border: "1px solid var(--color-border, #e2e8f0)",
                  borderRadius: 8,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  minWidth: 110,
                  overflow: "hidden",
                  zIndex: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => handleDuplicate(b.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "10px 14px",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  복제
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(b.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "10px 14px",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 13,
                    color: "var(--color-danger, #e53e3e)",
                  }}
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Close menu on backdrop click */}
      {menuOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1 }}
          onClick={() => setMenuOpen(null)}
        />
      )}

      {showCreate && (
        <CreateBoardModal
          classrooms={classrooms}
          onClose={() => setShowCreate(false)}
        />
      )}
    </>
  );
}
