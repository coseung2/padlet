"use client";

import Link from "next/link";

type BoardItem = {
  id: string;
  slug: string;
  title: string;
  layout: string;
};

type Props = {
  studentName: string;
  classroomName: string;
  boards: BoardItem[];
};

const LAYOUT_LABEL: Record<string, string> = {
  freeform: "자유 배치",
  grid: "그리드",
  stream: "스트림",
  columns: "칼럼",
  assignment: "과제 배부",
  quiz: "퀴즈",
};

export function StudentDashboard({ studentName, classroomName, boards }: Props) {
  return (
    <>
      <h1 className="student-greeting">{studentName}님, 안녕하세요!</h1>
      <span className="student-classroom-badge">{classroomName}</span>

      {boards.length === 0 ? (
        <div className="student-empty">
          <p>아직 보드가 없습니다</p>
        </div>
      ) : (
        <div className="student-board-grid">
          {boards.map((b) => (
            <Link
              key={b.id}
              href={`/board/${b.slug}`}
              className="student-board-card"
            >
              <span className="student-board-card-title">{b.title}</span>
              <span className="student-board-card-meta">
                {LAYOUT_LABEL[b.layout] ?? b.layout}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
