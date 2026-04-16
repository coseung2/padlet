"use client";

// Teacher-only composer for a new AssessmentTemplate. MVP-0 accepts MCQ
// only — the UI doesn't even offer a kind dropdown. On save the route
// returns the created template and the parent switches view.

import { useState } from "react";
import type {
  AssessmentChoice,
  AssessmentQuestionCreate,
} from "@/types/assessment";

const MAX_QUESTIONS = 20;
const MIN_CHOICES = 2;
const MAX_CHOICES = 6;
const CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

function blankChoice(i: number): AssessmentChoice {
  return { id: CHOICE_LETTERS[i] ?? String(i), text: "" };
}

function blankQuestion(): AssessmentQuestionCreate {
  return {
    prompt: "",
    choices: [blankChoice(0), blankChoice(1), blankChoice(2), blankChoice(3)],
    correctChoiceIds: ["A"],
    maxScore: 1,
  };
}

export interface AssessmentComposerProps {
  boardId: string;
  classroomId: string;
  onCreated: (templateId: string) => void;
}

export function AssessmentComposer({
  boardId,
  classroomId,
  onCreated,
}: AssessmentComposerProps) {
  const [title, setTitle] = useState("");
  const [durationMin, setDurationMin] = useState<number>(30);
  const [questions, setQuestions] = useState<AssessmentQuestionCreate[]>([
    blankQuestion(),
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateQ(i: number, patch: Partial<AssessmentQuestionCreate>) {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q))
    );
  }
  function updateChoice(qi: number, ci: number, text: string) {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qi) return q;
        const choices = q.choices.map((c, j) => (j === ci ? { ...c, text } : c));
        return { ...q, choices };
      })
    );
  }
  function toggleCorrect(qi: number, choiceId: string) {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qi) return q;
        const set = new Set(q.correctChoiceIds);
        if (set.has(choiceId)) set.delete(choiceId);
        else set.add(choiceId);
        if (set.size === 0) set.add(choiceId); // never empty
        return { ...q, correctChoiceIds: Array.from(set) };
      })
    );
  }
  function addChoice(qi: number) {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qi) return q;
        if (q.choices.length >= MAX_CHOICES) return q;
        return { ...q, choices: [...q.choices, blankChoice(q.choices.length)] };
      })
    );
  }
  function removeChoice(qi: number, ci: number) {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qi) return q;
        if (q.choices.length <= MIN_CHOICES) return q;
        const removed = q.choices[ci];
        const choices = q.choices.filter((_, j) => j !== ci);
        const correct = q.correctChoiceIds.filter((id) => id !== removed.id);
        return {
          ...q,
          choices,
          correctChoiceIds: correct.length ? correct : [choices[0].id],
        };
      })
    );
  }
  function removeQuestion(i: number) {
    setQuestions((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, idx) => idx !== i);
    });
  }
  function addQuestion() {
    setQuestions((prev) =>
      prev.length >= MAX_QUESTIONS ? prev : [...prev, blankQuestion()]
    );
  }

  async function save() {
    setError(null);
    if (!title.trim()) return setError("제목을 입력해주세요");
    if (durationMin < 1 || durationMin > 240)
      return setError("시간은 1~240분 사이여야 해요");
    for (const [i, q] of questions.entries()) {
      if (!q.prompt.trim()) return setError(`문항 ${i + 1} 질문이 비어있어요`);
      for (const c of q.choices)
        if (!c.text.trim())
          return setError(`문항 ${i + 1} 보기가 비어있어요`);
    }
    setSaving(true);
    try {
      const res = await fetch("/api/assessment/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          classroomId,
          boardId,
          title: title.trim(),
          durationMin,
          questions,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const { template } = (await res.json()) as { template: { id: string } };
      onCreated(template.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "save_failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="assessment-composer">
      <div className="assessment-composer-head">
        <h2 className="assessment-composer-title">수행평가 만들기</h2>
      </div>
      <div className="assessment-composer-meta">
        <label className="assessment-field">
          <span>제목</span>
          <input
            type="text"
            className="assessment-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 단원평가 1차"
            disabled={saving}
          />
        </label>
        <label className="assessment-field assessment-field-duration">
          <span>시간</span>
          <input
            type="number"
            className="assessment-input"
            min={1}
            max={240}
            value={durationMin}
            onChange={(e) =>
              setDurationMin(
                Math.min(240, Math.max(1, parseInt(e.target.value || "1", 10)))
              )
            }
            disabled={saving}
          />
          <span className="assessment-field-suffix">분</span>
        </label>
      </div>

      {error && (
        <div className="assessment-error" role="alert">
          ⚠ {error}
        </div>
      )}

      <div className="assessment-question-list">
        {questions.map((q, qi) => (
          <div key={qi} className="assessment-question-card">
            <div className="assessment-question-head">
              <span className="assessment-question-num">문항 {qi + 1}</span>
              <button
                type="button"
                className="assessment-question-remove"
                onClick={() => removeQuestion(qi)}
                disabled={questions.length <= 1 || saving}
                aria-label={`문항 ${qi + 1} 삭제`}
              >
                🗑
              </button>
            </div>
            <input
              type="text"
              className="assessment-input"
              placeholder="질문을 입력하세요"
              value={q.prompt}
              onChange={(e) => updateQ(qi, { prompt: e.target.value })}
              disabled={saving}
            />
            <div className="assessment-choice-list">
              {q.choices.map((c, ci) => (
                <div key={c.id} className="assessment-choice">
                  <label className="assessment-choice-check">
                    <input
                      type="checkbox"
                      checked={q.correctChoiceIds.includes(c.id)}
                      onChange={() => toggleCorrect(qi, c.id)}
                      disabled={saving}
                      aria-label={`보기 ${c.id} 정답 지정`}
                    />
                    <span className="assessment-choice-letter">{c.id}</span>
                  </label>
                  <input
                    type="text"
                    className="assessment-input assessment-choice-input"
                    placeholder={`보기 ${c.id}`}
                    value={c.text}
                    onChange={(e) => updateChoice(qi, ci, e.target.value)}
                    disabled={saving}
                  />
                  <button
                    type="button"
                    className="assessment-choice-remove"
                    onClick={() => removeChoice(qi, ci)}
                    disabled={q.choices.length <= MIN_CHOICES || saving}
                    aria-label={`보기 ${c.id} 삭제`}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="assessment-btn assessment-btn-ghost"
                onClick={() => addChoice(qi)}
                disabled={q.choices.length >= MAX_CHOICES || saving}
              >
                + 보기 추가 ({q.choices.length}/{MAX_CHOICES})
              </button>
            </div>
            <div className="assessment-question-meta">
              <label>
                배점{" "}
                <input
                  type="number"
                  className="assessment-input assessment-score-input"
                  min={1}
                  max={100}
                  value={q.maxScore ?? 1}
                  onChange={(e) =>
                    updateQ(qi, {
                      maxScore: Math.min(
                        100,
                        Math.max(1, parseInt(e.target.value || "1", 10))
                      ),
                    })
                  }
                  disabled={saving}
                />
                점
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="assessment-composer-actions">
        <button
          type="button"
          className="assessment-btn assessment-btn-ghost"
          onClick={addQuestion}
          disabled={questions.length >= MAX_QUESTIONS || saving}
        >
          + 문항 추가 ({questions.length}/{MAX_QUESTIONS})
        </button>
        <button
          type="button"
          className="assessment-btn assessment-btn-primary"
          onClick={save}
          disabled={saving}
        >
          {saving ? "저장 중..." : "저장 →"}
        </button>
      </div>
    </div>
  );
}
