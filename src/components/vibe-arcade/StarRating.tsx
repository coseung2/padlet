"use client";

// StarRating — readonly/editable star display (Seed 13 tokens_patch).
// aria: role=radiogroup, each star as radio button. 5점 기본, 1-5 정수.

import { useState } from "react";

type StarRatingProps =
  | {
      value: number;
      size?: "sm" | "md" | "lg";
      readonly: true;
      onChange?: never;
    }
  | {
      value: number;
      size?: "sm" | "md" | "lg";
      readonly?: false;
      onChange: (rating: number) => void;
    };

const SIZE_PX: Record<"sm" | "md" | "lg", number> = {
  sm: 16,
  md: 20,
  lg: 32,
};

export function StarRating(props: StarRatingProps) {
  const size = SIZE_PX[props.size ?? "sm"];
  const [hover, setHover] = useState<number | null>(null);
  const isEditable = !props.readonly;

  function starColor(index: number): string {
    const active = (hover ?? Math.round(props.value)) >= index;
    return active ? "var(--color-vibe-rating)" : "var(--color-vibe-rating-empty)";
  }

  return (
    <div
      role={isEditable ? "radiogroup" : undefined}
      aria-label="별점 1~5점"
      style={{
        display: "inline-flex",
        gap: size === 32 ? 4 : size === 20 ? 3 : 2,
      }}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = starColor(i);
        const star = (
          <svg
            width={size}
            height={size}
            viewBox="0 0 20 20"
            fill={filled}
            aria-hidden
            focusable="false"
          >
            <path d="M10 1.5l2.47 5.5 6.03.54-4.56 4.06 1.38 5.9L10 14.64l-5.32 2.86 1.38-5.9L1.5 7.54l6.03-.54L10 1.5z" />
          </svg>
        );

        if (!isEditable) return <span key={i}>{star}</span>;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={Math.round(props.value) === i}
            aria-label={`${i}점`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            onClick={() => props.onChange(i)}
            style={{
              border: 0,
              padding: 0,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}
