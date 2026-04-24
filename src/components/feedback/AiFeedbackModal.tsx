"use client";

import { useEffect, useState } from "react";

type Props = {
  studentId: string;
  studentName: string;
  studentNumber?: number | null;
  /** 'art' v1 고정. 미래 다과목 확장 시 호출자에서 지정. */
  subject?: string;
  /** 모달 닫기. */
  onClose: () => void;
};

/**
 * AI 평어 생성·전송 모달.
 *
 * - 단원 + 평가항목 2필드 입력 → "미리보기" 누르면 LLM 호출 → 평어 텍스트 생성
 * - 텍스트는 사용자가 직접 수정 가능
 * - "보내기" 누르면 UPSERT 저장 (영속 정책 B)
 * - "미리보기"만 누르고 닫으면 휘발 (저장 안 함)
 */
export function AiFeedbackModal({
  studentId,
  studentName,
  studentNumber,
  subject = "art",
  onClose,
}: Props) {
  const [unit, setUnit] = useState("");
  const [criterion, setCriterion] = useState("");
  const [comment, setComment] = useState("");
  const [model, setModel] = useState("");
  const [busyKind, setBusyKind] = useState<"preview" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && busyKind === null) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busyKind]);

  function explainError(e: string): string {
    if (e === "ai_key_missing") {
      return "교사 LLM API Key 가 등록돼 있지 않아요. /docs/ai-setup 에서 등록 후 다시 시도하세요.";
    }
    if (e === "ai_key_decrypt_failed") {
      return "LLM Key 복호화에 실패했어요. /docs/ai-setup 에서 키를 다시 저장해주세요.";
    }
    if (e === "not_classroom_owner") return "권한이 없어요.";
    if (e === "llm_failed") return "LLM 호출 실패. 잠시 후 다시 시도해주세요.";
    return e;
  }

  async function handlePreview() {
    if (busyKind) return;
    if (!unit.trim() || !criterion.trim()) {
      setError("단원과 평가항목을 모두 입력하세요");
      return;
    }
    setBusyKind("preview");
    setError(null);
    try {
      const res = await fetch("/api/ai-feedback/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentId,
          subject,
          unit: unit.trim(),
          criterion: criterion.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        comment?: string;
        model?: string;
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        setError(explainError(data.error ?? `http ${res.status}`) + (data.detail ? ` — ${data.detail}` : ""));
        return;
      }
      setComment(data.comment ?? "");
      setModel(data.model ?? "");
      setSent(false);
    } finally {
      setBusyKind(null);
    }
  }

  async function handleSend() {
    if (busyKind) return;
    if (!comment.trim()) {
      setError("미리보기를 먼저 생성하거나 직접 입력하세요");
      return;
    }
    setBusyKind("send");
    setError(null);
    try {
      const res = await fetch("/api/ai-feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentId,
          subject,
          unit: unit.trim(),
          criterion: criterion.trim(),
          comment: comment.trim(),
          model: model || "manual",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(explainError(data.error ?? `http ${res.status}`));
        return;
      }
      setSent(true);
    } finally {
      setBusyKind(null);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && busyKind === null) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="AI 평어 작성"
    >
      <div className="ai-feedback-modal">
        <header className="ai-feedback-modal__header">
          <h3>
            ✨ AI 평어 작성{" "}
            <span className="ai-feedback-modal__subject">[{subject}]</span>
          </h3>
          <span className="ai-feedback-modal__student">
            {studentNumber ? `${studentNumber}번 ` : ""}
            {studentName}
          </span>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={busyKind !== null}
            aria-label="닫기"
          >
            ×
          </button>
        </header>

        <div className="ai-feedback-modal__body">
          <label className="ai-feedback-modal__field">
            <span>단원</span>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="예: 상상의 세계 그리기"
              maxLength={120}
              disabled={busyKind !== null}
            />
          </label>
          <label className="ai-feedback-modal__field">
            <span>평가항목</span>
            <input
              type="text"
              value={criterion}
              onChange={(e) => setCriterion(e.target.value)}
              placeholder="예: 색채 표현하기"
              maxLength={120}
              disabled={busyKind !== null}
            />
          </label>

          <label className="ai-feedback-modal__field ai-feedback-modal__field--comment">
            <span>
              평어 본문{" "}
              {model && <small className="ai-feedback-modal__model">({model})</small>}
            </span>
            <textarea
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                setSent(false);
              }}
              rows={5}
              maxLength={2000}
              placeholder="미리보기 버튼을 누르면 AI 가 평어 초안을 생성합니다. 직접 입력·수정도 가능."
              disabled={busyKind === "send"}
            />
            <small className="ai-feedback-modal__counter">{comment.length}/2000</small>
          </label>

          {error && <p className="ai-feedback-modal__error">{error}</p>}
          {sent && (
            <p className="ai-feedback-modal__success">
              ✓ 저장 완료. Aura 에서 풀하면 즉시 반영됩니다.
            </p>
          )}
        </div>

        <footer className="ai-feedback-modal__footer">
          <button
            type="button"
            className="ai-feedback-modal__btn ai-feedback-modal__btn--ghost"
            onClick={handlePreview}
            disabled={busyKind !== null}
          >
            {busyKind === "preview" ? "생성 중…" : "미리보기"}
          </button>
          <button
            type="button"
            className="ai-feedback-modal__btn ai-feedback-modal__btn--primary"
            onClick={handleSend}
            disabled={busyKind !== null || comment.trim().length === 0}
          >
            {busyKind === "send" ? "보내는 중…" : sent ? "다시 보내기" : "보내기"}
          </button>
        </footer>
      </div>
    </div>
  );
}
