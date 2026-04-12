"use client";

import { useState } from "react";
import { BoardSettingsPanel, type BoardSection } from "./BoardSettingsPanel";

type Props = {
  boardId: string;
  layout: string;
  sections: BoardSection[];
};

/**
 * BoardSettingsLauncher — renders the ⚙ button next to EditableTitle and
 * lazily opens BoardSettingsPanel. Owner/editor gating is done at the
 * server component (see BoardHeader in app/board/[id]/page.tsx) so this
 * component trusts its caller and always renders when mounted.
 */
export function BoardSettingsLauncher({ boardId, layout, sections }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="board-settings-trigger"
        aria-label="보드 설정 열기"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        title="보드 설정"
      >
        <span aria-hidden="true">⚙</span>
      </button>
      {open && (
        <BoardSettingsPanel
          open={open}
          onClose={() => setOpen(false)}
          boardId={boardId}
          layout={layout}
          initialSections={sections}
        />
      )}
    </>
  );
}
