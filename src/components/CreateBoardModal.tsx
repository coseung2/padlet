"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LAYOUTS = [
  { id: "freeform", emoji: "🎯", label: "자유 배치", desc: "캔버스 위에 자유롭게 카드 배치" },
  { id: "grid", emoji: "🔲", label: "그리드", desc: "깔끔한 격자 형태로 카드 정렬" },
  { id: "stream", emoji: "📜", label: "스트림", desc: "위에서 아래로 흐르는 피드형" },
  { id: "columns", emoji: "📊", label: "칼럼", desc: "Kanban 스타일 섹션별 관리" },
  { id: "assignment", emoji: "📋", label: "과제 배부", desc: "학생별 과제 제출 및 확인" },
  { id: "quiz", emoji: "🎮", label: "퀴즈", desc: "카훗 스타일 실시간 퀴즈 게임" },
  { id: "drawing", emoji: "🎨", label: "그림보드", desc: "Drawpile 기반 공동 그림판 + 라이브러리" },
] as const;

type ClassroomItem = {
  id: string;
  name: string;
  studentCount: number;
};

type Props = {
  classrooms: ClassroomItem[];
  onClose: () => void;
};

export function CreateBoardModal({ classrooms, onClose }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"layout" | "classroom">("layout");
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);

  async function createBoard(layoutId: string, classroomId?: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "",
          layout: layoutId,
          classroomId,
        }),
      });
      if (res.ok) {
        const { board } = await res.json();
        router.push(`/board/${board.slug}`);
      } else {
        alert(`보드 생성 실패: ${await res.text()}`);
        setBusy(false);
      }
    } catch (err) {
      console.error(err);
      setBusy(false);
    }
  }

  function handleSelect(layoutId: string) {
    if (layoutId === "columns" && classrooms.length > 0) {
      setSelectedLayout(layoutId);
      setStep("classroom");
    } else {
      createBoard(layoutId);
    }
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="add-card-modal create-board-modal">
        <div className="modal-header">
          <h2 className="modal-title">
            {step === "layout" ? "새 보드 만들기" : "학급 선택"}
          </h2>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {step === "layout" && (
            <>
              <p className="create-board-hint">보드 유형을 선택하세요</p>
              <div className="layout-picker">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className="layout-option"
                    onClick={() => handleSelect(l.id)}
                    disabled={busy}
                  >
                    <span className="layout-option-emoji">{l.emoji}</span>
                    <span className="layout-option-label">{l.label}</span>
                    <span className="layout-option-desc">{l.desc}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "classroom" && selectedLayout && (
            <>
              <p className="create-board-hint">
                학급을 선택하면 학생별 칼럼이 자동 생성됩니다
              </p>
              <div className="layout-picker">
                <button
                  type="button"
                  className="layout-option"
                  onClick={() => createBoard(selectedLayout)}
                  disabled={busy}
                >
                  <span className="layout-option-emoji">📊</span>
                  <span className="layout-option-label">빈 칼럼보드</span>
                  <span className="layout-option-desc">학급 연결 없이 빈 보드 생성</span>
                </button>
                {classrooms.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="layout-option"
                    onClick={() => createBoard(selectedLayout, c.id)}
                    disabled={busy}
                  >
                    <span className="layout-option-emoji">🏫</span>
                    <span className="layout-option-label">{c.name}</span>
                    <span className="layout-option-desc">
                      학생 {c.studentCount}명 → {c.studentCount}개 칼럼 자동 생성
                    </span>
                  </button>
                ))}
              </div>
              <div className="modal-actions" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="modal-btn-cancel"
                  onClick={() => { setStep("layout"); setSelectedLayout(null); }}
                  disabled={busy}
                >
                  ← 뒤로
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
