import type { CardData } from "../DraggableCard";

export type SortMode = "manual" | "newest" | "oldest" | "title";

export function toSortMode(v: string | null | undefined): SortMode {
  return v === "newest" || v === "oldest" || v === "title" ? v : "manual";
}

export function comparatorFor(
  mode: SortMode
): (a: CardData, b: CardData) => number {
  switch (mode) {
    case "newest":
      return (a, b) => parseTime(b.createdAt) - parseTime(a.createdAt);
    case "oldest":
      return (a, b) => parseTime(a.createdAt) - parseTime(b.createdAt);
    case "title":
      return (a, b) => a.title.localeCompare(b.title, "ko");
    case "manual":
    default:
      return (a, b) => a.order - b.order;
  }
}

function parseTime(value: string | undefined): number {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}
