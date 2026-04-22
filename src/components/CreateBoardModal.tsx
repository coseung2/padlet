"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateBreakoutBoardModal } from "./CreateBreakoutBoardModal";

// `hidden: true`는 CreateBoardModal의 레이아웃 피커에서만 숨김 — 백엔드
// enum, 기존 보드 렌더, 라우트는 그대로 유지. 나중에 쓸지 결정되면 플래그만
// 지우면 다시 노출. (사용자 결정 2026-04-22)
const LAYOUTS = [
  { id: "freeform", emoji: "🎯", label: "자유 배치", desc: "캔버스 위에 자유롭게 카드 배치", hidden: true },
  { id: "grid", emoji: "🔲", label: "그리드", desc: "깔끔한 격자 형태로 카드 정렬", hidden: true },
  { id: "stream", emoji: "📜", label: "스트림", desc: "위에서 아래로 흐르는 피드형", hidden: true },
  { id: "columns", emoji: "📊", label: "주제별 보드", desc: "주제별로 게시물을 올릴 수 있습니다" },
  { id: "assignment", emoji: "📋", label: "과제 배부", desc: "학생별 과제 제출 및 확인" },
  { id: "quiz", emoji: "🎮", label: "퀴즈", desc: "카훗 스타일 실시간 퀴즈 게임" },
  { id: "drawing", emoji: "🎨", label: "그림보드", desc: "Drawpile 기반 공동 그림판 + 라이브러리", hidden: true },
  { id: "breakout", emoji: "👥", label: "모둠 학습", desc: "템플릿 기반 모둠 협력 보드 (KWL · 브레인스토밍 등)", hidden: true },
  { id: "assessment", emoji: "📝", label: "수행평가", desc: "교사가 입력해둔 답안 기반 OMR 채점 기능" },
  { id: "dj-queue", emoji: "🎧", label: "DJ 큐", desc: "학생이 YouTube 곡을 신청 · DJ가 재생 순서 관리" },
  { id: "vibe-arcade", emoji: "💻", label: "코딩 교실", desc: "생성형 AI를 활용한 바이브 코딩 교실" },
  { id: "vibe-gallery", emoji: "🖼️", label: "코딩 갤러리", desc: "승인된 코딩 결과물을 전시 · 체험" },
] as const;

const VISIBLE_LAYOUTS = LAYOUTS.filter((l) => !("hidden" in l && l.hidden));

type ClassroomItem = {
  id: string;
  name: string;
  studentCount: number;
};

type Props = {
  classrooms: ClassroomItem[];
  userTier?: "free" | "pro";
  onClose: () => void;
};

export function CreateBoardModal({ classrooms, userTier = "pro", onClose }: Props) {
  // Default matches backend tier.ts: solo-teacher deployment defaults to Pro
  // unless FREE_USER_IDS env explicitly lists this user. The old "free"
  // default made every breakout template look locked even for Pro users.
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"layout" | "classroom" | "breakout">("layout");
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
    if (layoutId === "breakout") {
      setSelectedLayout(layoutId);
      setStep("breakout");
      return;
    }
    if (
      (layoutId === "columns" ||
        layoutId === "assessment" ||
        layoutId === "dj-queue" ||
        layoutId === "vibe-arcade" ||
        layoutId === "vibe-gallery") &&
      classrooms.length > 0
    ) {
      setSelectedLayout(layoutId);
      setStep("classroom");
    } else {
      createBoard(layoutId);
    }
  }

  if (step === "breakout") {
    return (
      <CreateBreakoutBoardModal
        classrooms={classrooms}
        userTier={userTier}
        onClose={onClose}
        onBack={() => {
          setStep("layout");
          setSelectedLayout(null);
        }}
      />
    );
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
              <div className="layout-grid-picker">
                {VISIBLE_LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className="layout-grid-option"
                    onClick={() => handleSelect(l.id)}
                    disabled={busy}
                  >
                    <span className="layout-grid-option-emoji">{l.emoji}</span>
                    <span className="layout-grid-option-label">{l.label}</span>
                    <span className="layout-grid-option-desc">{l.desc}</span>
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
