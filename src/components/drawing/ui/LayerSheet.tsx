"use client";

import { useEffect, type ReactNode } from "react";

/**
 * 오른쪽에서 슬라이드 인 하는 레이어 패널 컨테이너.
 *
 * `is-open` 상태일 때만 content pointer 이벤트를 받는다. Esc 또는
 * backdrop 클릭 시 `onClose` 를 호출.
 */
export function LayerSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <button
          type="button"
          className="ds-sheet-backdrop"
          aria-label="레이어 패널 닫기"
          onClick={onClose}
        />
      )}
      <aside
        className={`ds-layer-sheet ${open ? "is-open" : ""}`}
        aria-hidden={!open}
        role="dialog"
        aria-label="레이어 패널"
      >
        {children}
      </aside>
    </>
  );
}
