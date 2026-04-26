"use client";

import { useEffect, useState } from "react";
import type { ShowcaseEntryDTO } from "@/lib/portfolio-dto";
import { ShowcaseCardChip } from "./ShowcaseCardChip";

type Props = {
  classroomId: string;
  /** chip 클릭 시 이동할 base 경로. 학생 dashboard 진입 시 "/student/portfolio",
   *  학부모 진입 시 자녀 portfolio. */
  hrefBase: string;
};

export function ShowcaseHighlightStrip({ classroomId, hrefBase }: Props) {
  const [entries, setEntries] = useState<ShowcaseEntryDTO[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/showcase/classroom/${encodeURIComponent(classroomId)}`,
      { cache: "no-store" }
    )
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setEntries([]);
          return;
        }
        const body = (await res.json()) as { entries: ShowcaseEntryDTO[] };
        if (!cancelled) setEntries(body.entries);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [classroomId]);

  if (loading) {
    return (
      <section className="showcase-strip is-loading" aria-label="우리 학급 자랑해요">
        <header className="showcase-strip-head">
          <h2>🌟 우리 학급 자랑해요</h2>
        </header>
        <div className="showcase-strip-row" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="showcase-chip-skeleton" />
          ))}
        </div>
      </section>
    );
  }

  if (!entries || entries.length === 0) {
    // 빈 상태는 섹션 자체 미노출 (조용한 fallback) — design_brief 결정
    return null;
  }

  return (
    <section className="showcase-strip" aria-label="우리 학급 자랑해요">
      <header className="showcase-strip-head">
        <h2>🌟 우리 학급 자랑해요</h2>
        <a className="showcase-strip-more" href={hrefBase}>
          더 보기 →
        </a>
      </header>
      <div className="showcase-strip-row">
        {entries.map((e) => (
          <ShowcaseCardChip
            key={e.cardId + ":" + e.studentId}
            entry={e}
            href={`/board/${e.card.sourceBoard.slug}`}
          />
        ))}
      </div>
    </section>
  );
}
