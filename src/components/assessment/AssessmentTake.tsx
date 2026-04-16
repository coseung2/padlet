"use client";

// Student-only take view. Fetches the template (student-DTO = no correct
// answers), starts/resumes a submission, renders a timer + question list
// with 300ms debounced answer autosave, and submits at the end. The
// result screen is a sibling (AssessmentResult) that polls for release.

import { useEffect, useMemo, useRef, useState } from "react";
import type { AssessmentTemplateStudentDTO } from "@/types/assessment";

type SubmissionRow = {
  id: string;
  status: "in_progress" | "submitted";
  startedAt: string;
  endAt: string;
  submittedAt: string | null;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      template: AssessmentTemplateStudentDTO;
      submission: SubmissionRow;
      clockSkewMs: number;
    };

export interface AssessmentTakeProps {
  templateId: string;
  onSubmitted: (submissionId: string) => void;
}

export function AssessmentTake({ templateId, onSubmitted }: AssessmentTakeProps) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // 1. Fetch template + start/resume submission.
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const t = await fetch(`/api/assessment/templates/${templateId}`);
        if (!t.ok) throw new Error(`template_${t.status}`);
        const tjson = (await t.json()) as {
          template: AssessmentTemplateStudentDTO;
          viewer: string;
        };
        if (tjson.viewer !== "student") throw new Error("not_student");
        const s = await fetch(
          `/api/assessment/templates/${templateId}/submissions`,
          { method: "POST" }
        );
        if (!s.ok) throw new Error(`submission_${s.status}`);
        const sjson = (await s.json()) as {
          submission: SubmissionRow;
          serverTime: string;
        };
        if (cancelled) return;
        const clockSkewMs =
          Date.now() - new Date(sjson.serverTime).getTime();
        setState({
          kind: "ready",
          template: tjson.template,
          submission: sjson.submission,
          clockSkewMs,
        });
      } catch (e) {
        if (!cancelled)
          setState({
            kind: "error",
            message: e instanceof Error ? e.message : "load_failed",
          });
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  // 2. Timer tick.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // 3. Debounced autosave per question.
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  function selectAnswer(questionId: string, choiceIds: string[]) {
    setAnswers((prev) => ({ ...prev, [questionId]: choiceIds }));
    if (state.kind !== "ready") return;
    const submissionId = state.submission.id;
    clearTimeout(timers.current[questionId]);
    setSaveState("saving");
    timers.current[questionId] = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/assessment/submissions/${submissionId}/answer`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ questionId, selectedChoiceIds: choiceIds }),
          }
        );
        if (res.ok) setSaveState("saved");
        else setSaveState("idle");
      } catch {
        setSaveState("idle");
      }
    }, 300);
  }

  async function handleSubmit() {
    if (state.kind !== "ready") return;
    if (!confirm("제출하면 수정할 수 없어요. 계속할까요?")) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/assessment/submissions/${state.submission.id}/submit`,
        { method: "POST" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      onSubmitted(state.submission.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "submit_failed");
    } finally {
      setSubmitting(false);
    }
  }

  const remainingSec = useMemo(() => {
    if (state.kind !== "ready") return 0;
    const endMs =
      new Date(state.submission.endAt).getTime() + state.clockSkewMs;
    return Math.max(0, Math.floor((endMs - now) / 1000));
  }, [state, now]);
  const expired = remainingSec === 0;
  const lowTime = remainingSec > 0 && remainingSec < 5 * 60;

  if (state.kind === "loading") {
    return <div className="assessment-take-loading">불러오는 중...</div>;
  }
  if (state.kind === "error") {
    return (
      <div className="assessment-take-error" role="alert">
        ⚠ 평가를 불러오지 못했어요: {state.message}
      </div>
    );
  }

  const mm = String(Math.floor(remainingSec / 60)).padStart(2, "0");
  const ss = String(remainingSec % 60).padStart(2, "0");

  return (
    <div className="assessment-take">
      <div
        className={`assessment-take-timer${lowTime ? " is-low" : ""}${expired ? " is-expired" : ""}`}
        role="timer"
        aria-live="polite"
      >
        <span className="assessment-take-timer-icon">⏱</span>
        <span className="assessment-take-timer-value">
          {mm}:{ss}
        </span>
        <span className="assessment-take-timer-label">
          {expired ? "시간 종료 — 제출해주세요" : "남은 시간"}
        </span>
        <span className="assessment-take-save">
          {saveState === "saving" ? "저장 중" : saveState === "saved" ? "저장됨" : ""}
        </span>
      </div>

      <h2 className="assessment-take-title">{state.template.title}</h2>

      <ol className="assessment-take-questions">
        {state.template.questions.map((q, i) => {
          const selected = answers[q.id] ?? [];
          // Every MCQ uses checkboxes so multi-correct questions work.
          // The correct-count itself is not revealed to the student —
          // they just see "하나 이상 선택" helper text.
          return (
            <li key={q.id} className="assessment-take-question">
              <div className="assessment-take-q-num">문항 {i + 1} / {state.template.questions.length}</div>
              <div className="assessment-take-q-prompt">{q.prompt}</div>
              <div
                role="group"
                aria-label={`문항 ${i + 1} 보기 선택`}
                className="assessment-take-choices"
              >
                {q.choices.map((c) => {
                  const checked = selected.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`assessment-take-choice${checked ? " is-checked" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? selected.filter((id) => id !== c.id)
                            : [...selected, c.id];
                          selectAnswer(q.id, next);
                        }}
                        disabled={expired || submitting}
                      />
                      <span className="assessment-take-choice-letter">{c.id}</span>
                      <span className="assessment-take-choice-text">{c.text}</span>
                    </label>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="assessment-take-submit-bar">
        <button
          type="button"
          className="assessment-btn assessment-btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "제출 중..." : "제출"}
        </button>
      </div>
    </div>
  );
}

