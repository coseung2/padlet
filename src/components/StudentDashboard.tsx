"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

type BoardItem = {
  id: string;
  slug: string;
  title: string;
  layout: string;
  quizzes?: { roomCode: string; status: string }[];
};

type Duty = {
  classroomId: string;
  classroomName: string;
  roleKey: string;
  roleLabel: string;
  emoji: string | null;
  href: string;
};

type Props = {
  studentName: string;
  classroomName: string;
  boards: BoardItem[];
  duties: Duty[];
};

const LAYOUT_LABEL: Record<string, string> = {
  freeform: "자유 배치",
  grid: "그리드",
  stream: "스트림",
  columns: "칼럼",
  assignment: "과제 배부",
  quiz: "퀴즈",
};

export function StudentDashboard({ studentName, classroomName, boards, duties }: Props) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/student/logout", { method: "POST" });
      router.push("/student/login");
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <h1 className="student-greeting">{studentName}님, 안녕하세요!</h1>
      <span className="student-classroom-badge">{classroomName}</span>
      <button
        className="student-logout-btn"
        onClick={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? "로그아웃 중..." : "로그아웃"}
      </button>

      {duties.length > 0 && (
        <section className="student-duty-section">
          <h2 className="student-duty-title">담당 업무</h2>
          <div className="student-duty-grid">
            {duties.map((d) => (
              <Link
                key={`${d.classroomId}-${d.roleKey}`}
                href={d.href}
                className="student-duty-card"
              >
                <span className="student-duty-emoji" aria-hidden="true">
                  {d.emoji ?? "🎖️"}
                </span>
                <span className="student-duty-role">{d.roleLabel}</span>
                <span className="student-duty-cta">업무 시작 →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {boards.length === 0 ? (
        <div className="student-empty">
          <p>아직 보드가 없습니다</p>
        </div>
      ) : (
        <div className="student-board-grid">
          {boards.map((b) => {
            const quizCode = b.layout === "quiz" && b.quizzes?.[0]?.roomCode;
            const href = quizCode ? `/quiz/${quizCode}` : `/board/${b.slug}`;
            return (
              <Link
                key={b.id}
                href={href}
                className="student-board-card"
              >
                <span className="student-board-card-title">{b.title}</span>
                <span className="student-board-card-meta">
                  {LAYOUT_LABEL[b.layout] ?? b.layout}
                  {quizCode && " — 참여하기"}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
