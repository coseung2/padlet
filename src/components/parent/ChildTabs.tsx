"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Horizontal tab strip for /parent/child/[studentId]/*.
// Scrollable on narrow viewports so the 5 labels don't clip.

const TABS = [
  { key: "plant", label: "식물" },
  { key: "drawing", label: "그림" },
  { key: "assignments", label: "숙제" },
  { key: "events", label: "행사" },
  { key: "breakout", label: "모둠" },
] as const;

export function ChildTabs({ studentId }: { studentId: string }) {
  const pathname = usePathname() ?? "";
  return (
    <nav
      aria-label="자녀 활동 탭"
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        padding: "8px 4px 12px",
        scrollbarWidth: "none",
      }}
    >
      {TABS.map((tab) => {
        const href = `/parent/child/${studentId}/${tab.key}`;
        const active = pathname.endsWith(`/${tab.key}`);
        return (
          <Link
            key={tab.key}
            href={href}
            prefetch={false}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              whiteSpace: "nowrap",
              textDecoration: "none",
              background: active
                ? "var(--color-primary, #4f46e5)"
                : "var(--color-surface, #fff)",
              color: active ? "#fff" : "var(--color-text, #111827)",
              border: active
                ? "1px solid var(--color-primary, #4f46e5)"
                : "1px solid var(--color-border, #e5e7eb)",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
