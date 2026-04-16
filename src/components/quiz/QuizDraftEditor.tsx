"use client";

// Draft editor — step 2 of QuizGenerateModal and standalone edit mode
// for existing quizzes (PUT /api/quiz/:id/questions). The parent owns
// the `questions` array; this component calls `onChange` on every edit
// and `onSave` when the user commits. Validation errors surface inline
// (border shake) and through the toast message bubbled up via onSave.

import { useState } from "react";
import type { QuizDraftQuestion } from "@/types/quiz";

const MAX_QUESTIONS = 10;
const ANSWER_LETTERS: ReadonlyArray<"A" | "B" | "C" | "D"> = [
  "A",
  "B",
  "C",
  "D",
];

function blankQuestion(): QuizDraftQuestion {
  return {
    question: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    answer: "A",
  };
}

function findInvalidIndex(questions: QuizDraftQuestion[]): number {
  return questions.findIndex(
    (q) =>
      !q.question.trim() ||
      !q.optionA.trim() ||
      !q.optionB.trim() ||
      !q.optionC.trim() ||
      !q.optionD.trim()
  );
}

export interface QuizDraftEditorProps {
  questions: QuizDraftQuestion[];
  onChange: (next: QuizDraftQuestion[]) => void;
  onBack: () => void;
  onSave: (questions: QuizDraftQuestion[]) => Promise<void>;
  title?: string;
  saving?: boolean;
}

export function QuizDraftEditor({
  questions,
  onChange,
  onBack,
  onSave,
  title = "퀴즈 편집",
  saving = false,
}: QuizDraftEditorProps) {
  const [errorIdx, setErrorIdx] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function update(i: number, patch: Partial<QuizDraftQuestion>) {
    const next = questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q));
    onChange(next);
  }

  function remove(i: number) {
    if (questions.length <= 1) return;
    onChange(questions.filter((_, idx) => idx !== i));
  }

  function add() {
    if (questions.length >= MAX_QUESTIONS) return;
    onChange([...questions, blankQuestion()]);
  }

  async function handleSave() {
    const bad = findInvalidIndex(questions);
    if (bad >= 0) {
      setErrorIdx(bad);
      setErrorMsg(`빈 항목을 채워주세요 (문항 ${bad + 1})`);
      return;
    }
    setErrorIdx(null);
    setErrorMsg(null);
    await onSave(questions);
  }

  return (
    <div className="quiz-draft-editor">
      <div className="quiz-draft-editor-header">
        <button
          type="button"
          className="quiz-draft-editor-back"
          onClick={onBack}
          disabled={saving}
        >
          ← 돌아가기
        </button>
        <h2 className="quiz-draft-editor-title">{title}</h2>
        <button
          type="button"
          className="quiz-btn quiz-btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>

      {errorMsg && (
        <div className="quiz-draft-editor-error" role="alert">
          ⚠ {errorMsg}
        </div>
      )}

      <div className="quiz-draft-editor-list">
        {questions.map((q, i) => (
          <div
            key={i}
            className={`quiz-draft-question${errorIdx === i ? " has-error" : ""}`}
          >
            <div className="quiz-draft-question-head">
              <span className="quiz-draft-question-num">문항 {i + 1}</span>
              <button
                type="button"
                className="quiz-draft-question-delete"
                onClick={() => remove(i)}
                aria-label={`문항 ${i + 1} 삭제`}
                disabled={questions.length <= 1 || saving}
              >
                🗑
              </button>
            </div>
            <input
              type="text"
              className="quiz-draft-input"
              placeholder="질문을 입력하세요"
              value={q.question}
              onChange={(e) => update(i, { question: e.target.value })}
              disabled={saving}
            />
            <div
              role="radiogroup"
              aria-label={`문항 ${i + 1} 정답 선택`}
              className="quiz-draft-options"
            >
              {ANSWER_LETTERS.map((letter) => {
                const key = `option${letter}` as const;
                return (
                  <label key={letter} className="quiz-draft-option">
                    <input
                      type="radio"
                      name={`answer-${i}`}
                      checked={q.answer === letter}
                      onChange={() => update(i, { answer: letter })}
                      disabled={saving}
                    />
                    <span className="quiz-draft-option-letter">{letter}</span>
                    <input
                      type="text"
                      className="quiz-draft-input quiz-draft-option-input"
                      placeholder={`보기 ${letter}`}
                      value={q[key]}
                      onChange={(e) => update(i, { [key]: e.target.value })}
                      disabled={saving}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="quiz-btn quiz-btn-secondary quiz-draft-add"
        onClick={add}
        disabled={questions.length >= MAX_QUESTIONS || saving}
      >
        + 문항 추가 ({questions.length}/{MAX_QUESTIONS})
      </button>
    </div>
  );
}
