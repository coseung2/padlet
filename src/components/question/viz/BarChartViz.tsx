"use client";

import { useMemo } from "react";
import { frequencyCounts } from "@/lib/question-board/tokenize";
import type { QuestionResponse } from "@/components/QuestionBoard";

type Props = { responses: QuestionResponse[] };

const TOP_N = 10;

export function BarChartViz({ responses }: Props) {
  const counts = useMemo(() => {
    const all = frequencyCounts(responses.map((r) => r.text));
    const top = all.slice(0, TOP_N);
    const rest = all.slice(TOP_N).reduce((sum, w) => sum + w.count, 0);
    return rest > 0 ? [...top, { word: "기타", count: rest }] : top;
  }, [responses]);

  const max = counts[0]?.count ?? 1;

  return (
    <div className="qb-bar-chart" role="list">
      {counts.map((row) => {
        const pct = Math.max(2, (row.count / max) * 100);
        return (
          <div key={row.word} className="qb-bar-row" role="listitem">
            <span className="qb-bar-label">{row.word}</span>
            <div className="qb-bar-track">
              <div
                className="qb-bar-fill"
                style={{ width: `${pct}%` }}
                aria-label={`${row.word}: ${row.count}회`}
              />
            </div>
            <span className="qb-bar-count">{row.count}</span>
          </div>
        );
      })}
    </div>
  );
}
