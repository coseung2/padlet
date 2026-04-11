"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateClassroomModal } from "./CreateClassroomModal";

type ClassroomItem = {
  id: string;
  name: string;
  code: string;
  _count: { students: number; boards: number };
};

type Props = {
  classrooms: ClassroomItem[];
  onRefresh: () => void;
};

export function ClassroomList({ classrooms, onRefresh }: Props) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <div className="classroom-grid">
        {/* New classroom card */}
        <button
          type="button"
          className="classroom-grid-card classroom-grid-new"
          onClick={() => setShowCreate(true)}
        >
          <div className="classroom-grid-new-icon">+</div>
          <span className="classroom-grid-new-label">학급 만들기</span>
        </button>

        {classrooms.map((c) => (
          <button
            key={c.id}
            type="button"
            className="classroom-grid-card"
            onClick={() => router.push(`/classroom/${c.id}`)}
          >
            <div className="classroom-grid-name">{c.name}</div>
            <div className="classroom-grid-code">{c.code}</div>
            <div className="classroom-grid-stats">
              <span className="classroom-stat">
                <span className="classroom-stat-num">{c._count.students}</span>
                <span className="classroom-stat-label">명</span>
              </span>
              <span className="classroom-stat-sep" />
              <span className="classroom-stat">
                <span className="classroom-stat-num">{c._count.boards}</span>
                <span className="classroom-stat-label">보드</span>
              </span>
            </div>
          </button>
        ))}
      </div>

      {classrooms.length === 0 && (
        <div className="classroom-empty">
          <p className="classroom-empty-text">아직 학급이 없습니다</p>
          <button
            type="button"
            className="classroom-empty-btn"
            onClick={() => setShowCreate(true)}
          >
            + 학급 만들기
          </button>
        </div>
      )}

      {showCreate && (
        <CreateClassroomModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
