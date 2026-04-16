"use client";

// OMR-style answer key composer. The teacher sets the number of
// questions, number of choices (4 or 5), and clicks the correct
// answer for each row. No question text — the exam paper is printed
// separately.

import { useState } from "react";
import type { AssessmentQuestionCreate } from "@/types/assessment";

const CHOICE_IDS_4 = ["①", "②", "③", "④"];
const CHOICE_IDS_5 = ["①", "②", "③", "④", "⑤"];

// 10문항 이하는 1단. 11문항 이상은 2단으로 쪼갠다 — 왼쪽이 크거나 같게
// 밸런스 (예: 15 → 8/7, 20 → 10/10, 25 → 13/12).
function splitIntoColumns(n: number): number[][] {
  if (n <= 10) return [Array.from({ length: n }, (_, i) => i)];
  const left = Math.ceil(n / 2);
  return [
    Array.from({ length: left }, (_, i) => i),
    Array.from({ length: n - left }, (_, i) => left + i),
  ];
}

function buildQuestions(
  count: number,
  choiceCount: 4 | 5,
  answers: Record<number, string>
): AssessmentQuestionCreate[] {
  const ids = choiceCount === 5 ? CHOICE_IDS_5 : CHOICE_IDS_4;
  return Array.from({ length: count }, (_, i) => ({
    prompt: `${i + 1}`,
    choices: ids.map((id) => ({ id, text: id })),
    correctChoiceIds: answers[i] ? [answers[i]] : [ids[0]],
    maxScore: 1,
  }));
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
  const [durationMin, setDurationMin] = useState(30);
  const [questionCount, setQuestionCount] = useState(20);
  const [choiceCount, setChoiceCount] = useState<4 | 5>(5);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choiceIds = choiceCount === 5 ? CHOICE_IDS_5 : CHOICE_IDS_4;

  function pick(qi: number, choiceId: string) {
    setAnswers((prev) => ({ ...prev, [qi]: choiceId }));
  }

  async function save() {
    setError(null);
    if (!title.trim()) return setError("제목을 입력해주세요");
    const unanswered = Array.from({ length: questionCount }, (_, i) => i).filter(
      (i) => !answers[i]
    );
    if (unanswered.length > 0) {
      return setError(`${unanswered.map((i) => i + 1).join(", ")}번 정답을 선택해주세요`);
    }
    setSaving(true);
    try {
      const questions = buildQuestions(questionCount, choiceCount, answers);
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
      <h2 className="assessment-composer-title">정답표 입력</h2>

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
        <label className="assessment-field assessment-field-sm">
          <span>시간</span>
          <div className="assessment-field-row">
            <input
              type="number"
              className="assessment-input"
              min={1}
              max={240}
              value={durationMin}
              onChange={(e) => setDurationMin(Math.min(240, Math.max(1, parseInt(e.target.value || "1", 10))))}
              disabled={saving}
            />
            <span className="assessment-field-suffix">분</span>
          </div>
        </label>
        <label className="assessment-field assessment-field-sm">
          <span>문항 수</span>
          <input
            type="number"
            className="assessment-input"
            min={1}
            max={50}
            value={questionCount}
            onChange={(e) => setQuestionCount(Math.min(50, Math.max(1, parseInt(e.target.value || "1", 10))))}
            disabled={saving}
          />
        </label>
        <label className="assessment-field assessment-field-sm">
          <span>선지</span>
          <select
            className="assessment-input"
            value={choiceCount}
            onChange={(e) => setChoiceCount(parseInt(e.target.value) as 4 | 5)}
            disabled={saving}
          >
            <option value={4}>4개</option>
            <option value={5}>5개</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="assessment-error" role="alert">
          ⚠ {error}
        </div>
      )}

      <div className="omr-grid-wrap">
        {splitIntoColumns(questionCount).map((range, ci) => (
          <div key={ci} className="omr-grid">
            <div className="omr-grid-header">
              <div className="omr-grid-num">번호</div>
              {choiceIds.map((id) => (
                <div key={id} className="omr-grid-col-header">{id}</div>
              ))}
            </div>
            {range.map((qi) => (
              <div key={qi} className="omr-grid-row">
                <div className="omr-grid-num">{qi + 1}</div>
                {choiceIds.map((id) => {
                  const selected = answers[qi] === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`omr-bubble${selected ? " is-filled" : ""}`}
                      onClick={() => pick(qi, id)}
                      disabled={saving}
                      aria-label={`${qi + 1}번 ${id} ${selected ? "선택됨" : ""}`}
                    >
                      {selected ? "●" : "○"}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="assessment-composer-actions">
        <div className="assessment-composer-progress">
          {Object.keys(answers).length}/{questionCount} 입력됨
        </div>
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
