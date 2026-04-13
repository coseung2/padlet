"use client";

import { memo } from "react";
import { pickAuthorName, formatRelativeKo } from "@/lib/card-author";

type Props = {
  externalAuthorName?: string | null;
  studentAuthorName?: string | null;
  authorName?: string | null;
  createdAt?: string | Date | null;
};

export const CardAuthorFooter = memo(function CardAuthorFooter({
  externalAuthorName,
  studentAuthorName,
  authorName,
  createdAt,
}: Props) {
  const name = pickAuthorName(externalAuthorName, studentAuthorName, authorName);
  if (!name && !createdAt) return null;

  const iso =
    createdAt instanceof Date
      ? createdAt.toISOString()
      : typeof createdAt === "string"
        ? createdAt
        : null;
  const time = iso ? formatRelativeKo(iso) : null;

  return (
    <footer className="card-author-footer">
      {name && (
        <span className="card-author-chip" title={name}>
          <span className="sr-only">작성자: </span>
          <span className="card-author-name">{name}</span>
        </span>
      )}
      {time && iso && (
        <time
          dateTime={iso}
          title={time.abs}
          className="card-author-time"
        >
          {time.rel}
        </time>
      )}
    </footer>
  );
});
