"use client";

import type { ShowcaseEntryDTO } from "@/lib/portfolio-dto";

type Props = {
  entry: ShowcaseEntryDTO;
  /** chip 클릭 시 이동 — 학생: 포트폴리오 페이지의 그 학생, 학부모: 자녀
   *  포트폴리오 페이지 (자녀가 본 친구 작품). v1 단순히 보드 deep-link */
  href: string;
};

export function ShowcaseCardChip({ entry, href }: Props) {
  const card = entry.card;
  const thumbSrc = card.thumbUrl || card.imageUrl || card.linkImage;
  return (
    <a
      className="showcase-chip"
      href={href}
      style={{ backgroundColor: card.color ?? undefined }}
      aria-label={`${entry.studentName}의 자랑해요: ${card.title || "제목 없음"}`}
    >
      <div className="showcase-chip-thumb" aria-hidden>
        {thumbSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbSrc} alt="" loading="lazy" />
        ) : (
          <span className="showcase-chip-thumb-fallback">📄</span>
        )}
      </div>
      <div className="showcase-chip-meta">
        <strong className="showcase-chip-title">
          {card.title || "제목 없음"}
        </strong>
        <span className="showcase-chip-author">
          {entry.studentNumber != null
            ? `${entry.studentNumber}. ${entry.studentName}`
            : entry.studentName}
        </span>
      </div>
    </a>
  );
}
