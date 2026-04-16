"use client";

// Student-only post-submit view. Polls /result every 10s until the
// teacher releases the gradebook entry; then renders score + per-question
// correct/wrong breakdown.

import { useEffect, useState } from "react";
import type { AssessmentResultPayload } from "@/types/assessment";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: AssessmentResultPayload };

export interface AssessmentResultProps {
  submissionId: string;
}

export function AssessmentResult({ submissionId }: AssessmentResultProps) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/assessment/submissions/${submissionId}/result`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as AssessmentResultPayload;
        if (!cancelled) setState({ kind: "ready", data });
      } catch (e) {
        if (!cancelled)
          setState({
            kind: "error",
            message: e instanceof Error ? e.message : "load_failed",
          });
      }
    }
    load();
    const timer = setInterval(() => {
      // Stop polling once released; the render path below leaves state
      // in a `released=true` terminal which we can detect cheaply.
      if (state.kind === "ready" && state.data.released) return;
      load();
    }, 10_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  if (state.kind === "loading") {
    return <div className="assessment-result-loading">불러오는 중...</div>;
  }
  if (state.kind === "error") {
    return (
      <div className="assessment-result-error" role="alert">
        ⚠ 결과를 불러오지 못했어요
      </div>
    );
  }
  const { data } = state;
  if (!data.released) {
    return (
      <div className="assessment-result-pending">
        <div className="assessment-result-icon">📭</div>
        <div className="assessment-result-title">결과 공개 대기 중</div>
        <div className="assessment-result-sub">
          선생님이 공개하면 자동으로 여기에 표시돼요.
        </div>
      </div>
    );
  }

  return (
    <div className="assessment-result">
      <div className="assessment-result-score">
        <div className="assessment-result-score-value">
          {data.finalScore} / {data.maxScoreTotal}
        </div>
        <div className="assessment-result-score-label">점</div>
      </div>
      <ol className="assessment-result-questions">
        {data.questions.map((q, i) => (
          <li
            key={q.id}
            className={`assessment-result-question assessment-result-question-${
              q.correct ? "correct" : "wrong"
            }`}
          >
            <div className="assessment-result-q-head">
              <span className="assessment-result-q-num">{i + 1}.</span>
              <span className="assessment-result-q-verdict">
                {q.correct ? "🟢 정답" : "🔴 오답"}
              </span>
            </div>
            <div className="assessment-result-q-prompt">{q.prompt}</div>
            <div className="assessment-result-q-detail">
              내 답: {q.selectedChoiceIds.length === 0
                ? "(선택 안 함)"
                : q.selectedChoiceIds
                    .map((cid) => q.choices.find((c) => c.id === cid)?.text ?? cid)
                    .join(", ")}
              {!q.correct && (
                <>
                  {" "}
                  → 정답:{" "}
                  {q.correctChoiceIds
                    .map((cid) => q.choices.find((c) => c.id === cid)?.text ?? cid)
                    .join(", ")}
                </>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
