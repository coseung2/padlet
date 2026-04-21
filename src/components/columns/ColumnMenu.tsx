"use client";

import { useEffect, useRef, useState } from "react";
import type { MenuItem } from "../ContextMenu";

export type SortMode = "manual" | "newest" | "oldest" | "title";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "manual", label: "수동" },
  { value: "newest", label: "최신순" },
  { value: "oldest", label: "오래된 순" },
  { value: "title", label: "제목순" },
];

type Props = {
  sortMode: SortMode;
  canSort: boolean;
  onSetSort: (mode: SortMode) => void;
  /** Non-sort actions (rename, clear, delete, …). Rendered after sort section. */
  actions?: MenuItem[];
  triggerTitle?: string;
};

/**
 * Column-header kebab menu — handoff ColumnsBoardPage ColumnMenu (T5-1).
 * Keeps ContextMenu's trigger/dropdown shell but adds a sort radio group
 * so teachers can switch per-column ordering without a separate <select>.
 */
export function ColumnMenu({
  sortMode,
  canSort,
  onSetSort,
  actions = [],
  triggerTitle,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const showSortSection = canSort;

  return (
    <div className="ctx-menu-wrap" ref={ref}>
      <button
        type="button"
        className="ctx-menu-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerTitle ?? "칼럼 메뉴"}
        title={triggerTitle ?? "칼럼 메뉴"}
      >
        ⋯
      </button>
      {open && (
        <div className="ctx-menu-dropdown" role="menu">
          {showSortSection && (
            <>
              <div className="ctx-menu-label">정렬</div>
              {SORT_OPTIONS.map((o) => {
                const selected = sortMode === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    className={`ctx-menu-item ctx-menu-item-radio${selected ? " is-selected" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                      onSetSort(o.value);
                    }}
                  >
                    <span className="ctx-menu-check" aria-hidden="true">
                      {selected ? "✓" : ""}
                    </span>
                    {o.label}
                  </button>
                );
              })}
              {actions.length > 0 && <div className="ctx-menu-sep" />}
            </>
          )}
          {actions.map((a, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              className={`ctx-menu-item${a.danger ? " ctx-menu-item-danger" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                a.onClick();
              }}
            >
              {a.icon && <span className="ctx-menu-icon">{a.icon}</span>}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
