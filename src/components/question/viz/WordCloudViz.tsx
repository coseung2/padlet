"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import cloud, { type Word } from "d3-cloud";
import { frequencyCounts } from "@/lib/question-board/tokenize";
import type { QuestionResponse } from "@/components/QuestionBoard";

type Props = {
  responses: QuestionResponse[];
};

type Placed = {
  text: string;
  size: number;
  x: number;
  y: number;
  rotate: number;
};

const WIDTH = 900;
const HEIGHT = 420;
const MAX_WORDS = 60;
const MIN_FONT = 12;
const MAX_FONT = 56;

// d3-cloud 는 canvas 로 글자 크기를 측정해 배치한다. 브라우저 전용 — 상위
// 컴포넌트가 dynamic(ssr:false) 로 감싸므로 여기서는 가정.
export function WordCloudViz({ responses }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<Placed[]>([]);

  const counts = useMemo(
    () => frequencyCounts(responses.map((r) => r.text)).slice(0, MAX_WORDS),
    [responses],
  );

  const maxCount = counts[0]?.count ?? 1;

  useEffect(() => {
    if (counts.length === 0) {
      setPlaced([]);
      return;
    }
    let cancelled = false;
    type CloudWord = Word & { text: string; count: number; size: number };
    const words: CloudWord[] = counts.map((c) => ({
      text: c.word,
      count: c.count,
      size: logSize(c.count, maxCount),
    }));
    cloud<CloudWord>()
      .size([WIDTH, HEIGHT])
      .words(words)
      .padding(2)
      .rotate(() => (Math.random() > 0.5 ? 0 : 90))
      .font("sans-serif")
      .fontSize((d) => d.size)
      .on("end", (output) => {
        if (cancelled) return;
        setPlaced(
          output.map((w) => ({
            text: w.text ?? "",
            size: w.size ?? MIN_FONT,
            x: w.x ?? 0,
            y: w.y ?? 0,
            rotate: w.rotate ?? 0,
          })),
        );
      })
      .start();
    return () => {
      cancelled = true;
    };
  }, [counts, maxCount]);

  return (
    <div ref={containerRef} className="qb-wordcloud">
      <svg
        viewBox={`${-WIDTH / 2} ${-HEIGHT / 2} ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        role="img"
        aria-label={`워드클라우드: 상위 ${counts.length}개 단어`}
      >
        <g>
          {placed.map((w, i) => (
            <text
              key={`${w.text}-${i}`}
              fontSize={w.size}
              transform={`translate(${w.x},${w.y}) rotate(${w.rotate})`}
              textAnchor="middle"
              fill={colorFor(i, placed.length)}
              fontWeight={w.size > 32 ? 700 : 500}
            >
              {w.text}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}

// log 스케일 — 빈도 1 이면 min, 최고 빈도 이면 max.
function logSize(count: number, maxCount: number): number {
  if (maxCount <= 1) return MIN_FONT + 8;
  const ratio = Math.log(count + 1) / Math.log(maxCount + 1);
  return Math.round(MIN_FONT + (MAX_FONT - MIN_FONT) * ratio);
}

// 빈도 상위 1/3 는 accent, 다음 1/3 는 text, 마지막 1/3 는 muted.
function colorFor(index: number, total: number): string {
  const ratio = total === 0 ? 0 : index / total;
  if (ratio < 1 / 3) return "var(--color-accent, #4a6cf7)";
  if (ratio < 2 / 3) return "var(--color-text, #222)";
  return "var(--color-text-muted, #888)";
}
