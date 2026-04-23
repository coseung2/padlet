"use client";

import type { QuestionResponse } from "@/components/QuestionBoard";

type Props = {
  responses: QuestionResponse[];
  onDelete?: (responseId: string) => void;
};

export function ResponseListViz({ responses, onDelete }: Props) {
  return (
    <ul className="qb-list">
      {responses.map((r) => (
        <li key={r.id} className="qb-list-item">
          <p className="qb-list-text">{r.text}</p>
          <span className="qb-list-author">{r.authorName}</span>
          {onDelete && (
            <button
              type="button"
              className="qb-list-delete"
              onClick={() => onDelete(r.id)}
              aria-label="응답 삭제"
            >
              ✕
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
