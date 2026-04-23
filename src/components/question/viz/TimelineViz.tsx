"use client";

import type { QuestionResponse } from "@/components/QuestionBoard";

type Props = {
  responses: QuestionResponse[];
  onDelete?: (responseId: string) => void;
};

export function TimelineViz({ responses, onDelete }: Props) {
  // SSE snapshot 이 desc 로 내려주므로 그대로 쓰면 최신이 위. asc 로 뒤집어
  // 아래가 최신인 timeline 느낌을 주려면 reverse. MVP 는 desc 유지 (최신 부각).
  return (
    <ol className="qb-timeline">
      {responses.map((r) => (
        <li key={r.id} className="qb-timeline-item">
          <time className="qb-timeline-time">{formatTime(r.createdAt)}</time>
          <div className="qb-timeline-body">
            <p className="qb-timeline-text">{r.text}</p>
            <span className="qb-timeline-author">{r.authorName}</span>
          </div>
          {onDelete && (
            <button
              type="button"
              className="qb-timeline-delete"
              onClick={() => onDelete(r.id)}
              aria-label="응답 삭제"
              title="응답 삭제"
            >
              ✕
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
