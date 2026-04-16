"use client";

// Report viewer — 3-stat summary + student×question matrix + CSV download.
// Loads /api/quiz/:id/report on mount; CSV download hits the .csv route
// with the same id so the server rebuilds the same dataset.

import { useEffect, useState } from "react";
import type { QuizReportPayload } from "@/types/quiz";

export interface QuizReportModalProps {
  quizId: string;
  onClose: () => void;
}

export function QuizReportModal({ quizId, onClose }: QuizReportModalProps) {
  const [report, setReport] = useState<QuizReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/quiz/${quizId}/report`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as QuizReportPayload;
        if (!cancelled) setReport(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "load_failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function renderBody() {
    if (loading) {
      return (
        <div className="quiz-report-skeleton" aria-label="불러오는 중">
          <div className="quiz-report-skeleton-row" />
          <div className="quiz-report-skeleton-row" />
          <div className="quiz-report-skeleton-row" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="quiz-report-error" role="alert">
          ⚠ 리포트를 불러올 수 없습니다
        </div>
      );
    }
    if (!report) return null;

    const { summary, questions, players } = report;
    const submitted = players.filter((p) => p.answers.some((a) => a.selected));

    if (summary.submittedCount === 0) {
      return (
        <div className="quiz-report-empty">
          <div className="quiz-report-empty-icon">📭</div>
          <div>아직 제출 기록이 없습니다</div>
        </div>
      );
    }

    return (
      <>
        <div className="quiz-report-summary">
          <div className="quiz-report-stat">
            <div className="quiz-report-stat-label">제출</div>
            <div className="quiz-report-stat-value">
              {summary.submittedCount}명
            </div>
          </div>
          <div className="quiz-report-stat">
            <div className="quiz-report-stat-label">정답률</div>
            <div className="quiz-report-stat-value">
              {Math.round(summary.avgCorrectRate * 100)}%
            </div>
          </div>
          <div className="quiz-report-stat">
            <div className="quiz-report-stat-label">평균 풀이 시간</div>
            <div className="quiz-report-stat-value">
              {(summary.avgTimeMs / 1000).toFixed(1)}초
            </div>
          </div>
        </div>

        <div
          className="quiz-report-matrix-wrap"
          aria-label="학생별 문항 결과 매트릭스. 가로 스크롤로 추가 문항 탐색"
        >
          <table className="quiz-report-matrix">
            <thead>
              <tr>
                <th className="quiz-report-matrix-name">이름</th>
                {questions.map((q, i) => (
                  <th key={q.id} scope="col">
                    {i + 1}
                  </th>
                ))}
                <th scope="col">맞힌 수</th>
              </tr>
            </thead>
            <tbody>
              {submitted.map((p) => (
                <tr key={p.playerId}>
                  <th scope="row" className="quiz-report-matrix-name">
                    {p.name}
                  </th>
                  {questions.map((q) => {
                    const a = p.answers.find((x) => x.questionId === q.id);
                    const state =
                      a?.correct === true
                        ? "correct"
                        : a?.correct === false
                          ? "wrong"
                          : "empty";
                    return (
                      <td
                        key={q.id}
                        className={`quiz-report-cell quiz-report-cell-${state}`}
                        aria-label={
                          state === "correct"
                            ? "정답"
                            : state === "wrong"
                              ? "오답"
                              : "미응답"
                        }
                      >
                        {state === "correct" ? "○" : state === "wrong" ? "✕" : "·"}
                      </td>
                    );
                  })}
                  <td>
                    {p.totalCorrect}/{questions.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="quiz-report-footer">
          <a
            className="quiz-btn quiz-btn-primary"
            href={`/api/quiz/${quizId}/report.csv`}
            download
          >
            ⬇ CSV 다운로드
          </a>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="quiz-modal quiz-report-modal"
        role="dialog"
        aria-modal="true"
        aria-label="퀴즈 리포트"
      >
        <div className="quiz-modal-header">
          <h2 className="quiz-modal-title">퀴즈 리포트</h2>
          <button
            type="button"
            className="quiz-modal-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        <div className="quiz-modal-body">{renderBody()}</div>
      </div>
    </>
  );
}
