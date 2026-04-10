"use client";

import { useState, useRef, useEffect } from "react";

export type MenuItem = {
  label: string;
  icon?: string;
  danger?: boolean;
  onClick: () => void;
};

type Props = {
  items: MenuItem[];
};

export function ContextMenu({ items }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="ctx-menu-wrap" ref={menuRef}>
      <button
        type="button"
        className="ctx-menu-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        aria-label="메뉴"
      >
        ⋯
      </button>
      {open && (
        <div className="ctx-menu-dropdown">
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              className={`ctx-menu-item ${item.danger ? "ctx-menu-item-danger" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
            >
              {item.icon && <span className="ctx-menu-icon">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
