"use client";

import Link from "next/link";

type Props = {
  boardTitle: string;
  boardSlug: string;
  templateName: string;
  groupCount: number;
  visibility: "own-only" | "peek-others";
  deployMode: "link-fixed" | "self-select" | "teacher-assign";
  localStatus: "active" | "archived";
  isOwner: boolean;
  archiving: boolean;
  onOpenManager: () => void;
  onArchive: () => void;
};

export function BreakoutHeader({
  boardTitle,
  boardSlug,
  templateName,
  groupCount,
  visibility,
  deployMode,
  localStatus,
  isOwner,
  archiving,
  onOpenManager,
  onArchive,
}: Props) {
  return (
    <div
      className="breakout-header"
      style={{
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span className="breakout-breadcrumb" style={{ flex: 1 }}>
        {boardTitle} · {templateName} · {groupCount}모둠
        {" · "}
        {visibility === "peek-others" ? "👁 모둠 간 열람" : "🔒 자기 모둠만"}
        {" · "}
        {deployMode === "link-fixed" && "🔗 링크 고정"}
        {deployMode === "self-select" && "✋ 자율 선택"}
        {deployMode === "teacher-assign" && "👩‍🏫 교사 배정"}
        {localStatus === "archived" && " · 📦 아카이브"}
      </span>
      {isOwner && localStatus === "active" && (
        <>
          <button type="button" className="column-add-btn" onClick={onOpenManager}>
            배정 관리
          </button>
          <Link href={`/board/${boardSlug}/archive`} className="column-add-btn">
            아카이브
          </Link>
          <button
            type="button"
            className="column-add-btn"
            onClick={onArchive}
            disabled={archiving}
            style={{ borderColor: "var(--color-danger,#c00)" }}
          >
            {archiving ? "종료 중…" : "세션 종료"}
          </button>
        </>
      )}
    </div>
  );
}
