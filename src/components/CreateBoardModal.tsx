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
] as const;

type Props = {
  onClose: () => void;
};

export function CreateBoardModal({ onClose }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleSelect(layoutId: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "", layout: layoutId }),
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

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="add-card-modal create-board-modal">
        <div className="modal-header">
          <h2 className="modal-title">새 보드 만들기</h2>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
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
        </div>
      </div>
    </>
  );
}
