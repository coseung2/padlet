"use client";

// OMR-style answer key composer. Per-question kind (MCQ | SHORT) with
// a row-level pill toggle. "모두 객관식" / "모두 단답형" bulk controls
// above the grid. No question text — the exam paper is printed
// separately.

import { useState } from "react";
import type { AssessmentQuestionCreate } from "@/types/assessment";

const CHOICE_IDS_4 = ["①", "②", "③", "④"];
const CHOICE_IDS_5 = ["①", "②", "③", "④", "⑤"];

type QKind = "MCQ" | "SHORT" | "MANUAL";

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
  kinds: Record<number, QKind>,
  mcqAnswers: Record<number, string[]>,
  shortAnswers: Record<number, string>
): AssessmentQuestionCreate[] {
  const cids = choiceCount === 5 ? CHOICE_IDS_5 : CHOICE_IDS_4;
  return Array.from({ length: count }, (_, i) => {
    const kind = kinds[i] ?? "MCQ";
    if (kind === "MANUAL") {
      return { kind: "MANUAL", prompt: `${i + 1}`, maxScore: 1 };
    }
    if (kind === "SHORT") {
      const raw = (shortAnswers[i] ?? "").replace(/\s+/g, "");
      return {
        kind: "SHORT",
        prompt: `${i + 1}`,
        correctAnswers: raw ? [raw] : [""],
        maxScore: 1,
      };
    }
    return {
      kind: "MCQ",
      prompt: `${i + 1}`,
      choices: cids.map((id) => ({ id, text: id })),
      correctChoiceIds: mcqAnswers[i]?.length ? mcqAnswers[i] : [cids[0]],
      maxScore: 1,
    };
  });
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
  const [kinds, setKinds] = useState<Record<number, QKind>>({});
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, string[]>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choiceIds = choiceCount === 5 ? CHOICE_IDS_5 : CHOICE_IDS_4;

  function getKind(qi: number): QKind {
    return kinds[qi] ?? "MCQ";
  }

  function toggleKind(qi: number) {
    // 3-way rotate: MCQ → SHORT → MANUAL → MCQ.
    setKinds((prev) => {
      const current = prev[qi] ?? "MCQ";
      const next: QKind =
        current === "MCQ" ? "SHORT" : current === "SHORT" ? "MANUAL" : "MCQ";
      return { ...prev, [qi]: next };
    });
  }

  function setAllKind(k: QKind) {
    const next: Record<number, QKind> = {};
    for (let i = 0; i < questionCount; i++) next[i] = k;
    setKinds(next);
  }

  function pick(qi: number, choiceId: string) {
    setMcqAnswers((prev) => {
      const current = prev[qi] ?? [];
      const has = current.includes(choiceId);
      const nextList = has
        ? current.filter((id) => id !== choiceId)
        : [...current, choiceId];
      if (nextList.length === 0) {
        const next = { ...prev };
        delete next[qi];
        return next;
      }
      return { ...prev, [qi]: nextList };
    });
  }

  function onShortInputChange(qi: number, raw: string) {
    // 띄어쓰기 제거 — space/tab/newline 모두 차단.
    const cleaned = raw.replace(/\s+/g, "");
    setShortAnswers((prev) => ({ ...prev, [qi]: cleaned }));
  }

  function isAnswered(qi: number): boolean {
    const k = getKind(qi);
    if (k === "MCQ") return (mcqAnswers[qi]?.length ?? 0) > 0;
    if (k === "SHORT") return (shortAnswers[qi] ?? "").length > 0;
    return true; // MANUAL 은 정답표 불필요 — 항상 답변됨 처리
  }

  async function save() {
    setError(null);
    if (!title.trim()) return setError("제목을 입력해주세요");
    const unanswered = Array.from({ length: questionCount }, (_, i) => i).filter(
      (i) => !isAnswered(i)
    );
    if (unanswered.length > 0) {
      return setError(`${unanswered.map((i) => i + 1).join(", ")}번 정답을 입력해주세요`);
    }
    setSaving(true);
    try {
      const questions = buildQuestions(
        questionCount,
        choiceCount,
        kinds,
        mcqAnswers,
        shortAnswers
      );
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

  const answeredCount = Array.from(
    { length: questionCount },
    (_, i) => i
  ).filter(isAnswered).length;

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

      <div className="assessment-composer-bulk">
        <span className="assessment-composer-bulk-label">전체 설정</span>
        <button
          type="button"
          className="assessment-btn assessment-btn-ghost"
          onClick={() => setAllKind("MCQ")}
          disabled={saving}
        >
          모두 객관식
        </button>
        <button
          type="button"
          className="assessment-btn assessment-btn-ghost"
          onClick={() => setAllKind("SHORT")}
          disabled={saving}
        >
          모두 단답형
        </button>
        <button
          type="button"
          className="assessment-btn assessment-btn-ghost"
          onClick={() => setAllKind("MANUAL")}
          disabled={saving}
        >
          모두 수동채점
        </button>
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
              <div className="omr-grid-kind">유형</div>
              {choiceIds.map((id) => (
                <div key={id} className="omr-grid-col-header">{id}</div>
              ))}
            </div>
            {range.map((qi) => {
              const kind = getKind(qi);
              return (
                <div key={qi} className="omr-grid-row">
                  <div className="omr-grid-num">{qi + 1}</div>
                  <button
                    type="button"
                    className={`omr-kind-chip omr-kind-chip-${kind === "MCQ" ? "mcq" : kind === "SHORT" ? "short" : "manual"}`}
                    onClick={() => toggleKind(qi)}
                    disabled={saving}
                    aria-label={`${qi + 1}번 유형: ${kind === "MCQ" ? "객관식" : kind === "SHORT" ? "단답형" : "수동채점"} (클릭하여 전환)`}
                  >
                    {kind === "MCQ" ? "객" : kind === "SHORT" ? "단" : "수"}
                  </button>
                  {kind === "MCQ" ? (
                    choiceIds.map((id) => {
                      const selected = (mcqAnswers[qi] ?? []).includes(id);
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
                    })
                  ) : kind === "SHORT" ? (
                    <div
                      className="omr-grid-short"
                      style={{ ["--choice-span" as string]: choiceIds.length }}
                    >
                      <input
                        type="text"
                        className="assessment-input omr-short-input"
                        placeholder="정답 (띄어쓰기 없이)"
                        value={shortAnswers[qi] ?? ""}
                        onChange={(e) => onShortInputChange(qi, e.target.value)}
                        onKeyDown={(e) => { if (e.key === " ") e.preventDefault(); }}
                        maxLength={50}
                        disabled={saving}
                        aria-label={`${qi + 1}번 단답형 정답`}
                      />
                    </div>
                  ) : (
                    <div
                      className="omr-grid-short omr-grid-manual"
                      style={{ ["--choice-span" as string]: choiceIds.length }}
                    >
                      수동채점 (채점 시 교사가 판정)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="assessment-composer-actions">
        <div className="assessment-composer-progress">
          {answeredCount}/{questionCount} 입력됨
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
