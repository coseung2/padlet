"use client";

import { useMemo } from "react";
import { frequencyCounts } from "@/lib/question-board/tokenize";
import type { QuestionResponse } from "@/components/QuestionBoard";

type Props = { responses: QuestionResponse[] };

const TOP_N = 6;
const COLORS = [
  "var(--color-accent, #4a6cf7)",
  "#ffb347",
  "#63c7b2",
  "#e05e7e",
  "#8a7bd8",
  "#5eb0ef",
  "#cfcfcf",
];

const SIZE = 240;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = SIZE / 2 - 10;

export function PieChartViz({ responses }: Props) {
  const slices = useMemo(() => {
    const all = frequencyCounts(responses.map((r) => r.text));
    const top = all.slice(0, TOP_N);
    const restSum = all.slice(TOP_N).reduce((sum, w) => sum + w.count, 0);
    const rows = restSum > 0 ? [...top, { word: "기타", count: restSum }] : top;
    const total = rows.reduce((sum, r) => sum + r.count, 0) || 1;
    let acc = 0;
    return rows.map((r, i) => {
      const startAngle = (acc / total) * Math.PI * 2 - Math.PI / 2;
      acc += r.count;
      const endAngle = (acc / total) * Math.PI * 2 - Math.PI / 2;
      return {
        ...r,
        pct: Math.round((r.count / total) * 100),
        path: arcPath(CX, CY, R, startAngle, endAngle),
        color: COLORS[i % COLORS.length],
      };
    });
  }, [responses]);

  return (
    <div className="qb-pie-chart">
      <svg width={SIZE} height={SIZE} role="img" aria-label="응답 비율">
        {slices.map((s, i) => (
          <path key={`${s.word}-${i}`} d={s.path} fill={s.color} />
        ))}
      </svg>
      <ul className="qb-pie-legend">
        {slices.map((s, i) => (
          <li key={`${s.word}-${i}`}>
            <span className="qb-pie-swatch" style={{ background: s.color }} />
            <span className="qb-pie-word">{s.word}</span>
            <span className="qb-pie-pct">{s.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function arcPath(cx: number, cy: number, r: number, a1: number, a2: number): string {
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const x2 = cx + r * Math.cos(a2);
  const y2 = cy + r * Math.sin(a2);
  const large = a2 - a1 > Math.PI ? 1 : 0;
  // 단일 슬라이스가 전체(360°) 일 때 SVG arc 는 퇴화 — 원 하나로 그려줌.
  if (a2 - a1 >= Math.PI * 2 - 0.0001) {
    return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
  }
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}
