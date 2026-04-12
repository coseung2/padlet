import Link from "next/link";
import { CardAttachments } from "./CardAttachments";

type CardLike = {
  id: string;
  title: string;
  content: string;
  color: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkTitle: string | null;
  linkDesc: string | null;
  linkImage: string | null;
  videoUrl: string | null;
};

type Props = {
  boardId: string;
  boardTitle: string;
  sectionTitle: string;
  cards: CardLike[];
  shareManagementHref?: string | null; // owner only
  autoJoinWarning?: string | null; // BR-5 link-fixed feedback
};

/**
 * Server component — no client state.
 * Renders ONLY the cards passed in (caller is responsible for scoping).
 */
export function SectionBreakoutView({
  boardId,
  boardTitle,
  sectionTitle,
  cards,
  shareManagementHref,
  autoJoinWarning,
}: Props) {
  return (
    <main className="board-page">
      <header className="board-header">
        <div className="board-header-left">
          <Link href={`/board/${boardId}`} className="board-back-link" aria-label="보드 전체 보기로">
            ←
          </Link>
          <h1 className="board-title">{sectionTitle}</h1>
          <span className="board-layout-badge">Breakout</span>
        </div>
        <div className="board-header-right">
          {shareManagementHref ? (
            <Link href={shareManagementHref} className="column-add-btn">
              공유 관리
            </Link>
          ) : null}
        </div>
      </header>

      <div className="breakout-header">
        <span className="breakout-breadcrumb">{boardTitle} › {sectionTitle}</span>
      </div>
      {autoJoinWarning && (
        <div
          role="alert"
          style={{
            margin: "8px 16px",
            padding: 12,
            background: "var(--color-warn-bg,#fff8e1)",
            color: "var(--color-warn,#8a6d00)",
            border: "1px solid var(--color-warn-border,#ffe08a)",
            borderRadius: 6,
          }}
        >
          {autoJoinWarning}
        </div>
      )}

      {cards.length === 0 ? (
        <p className="breakout-empty">이 섹션에는 아직 카드가 없어요.</p>
      ) : (
        <div className="breakout-grid" role="list">
          {cards.map((c) => (
            <article
              key={c.id}
              role="listitem"
              className="column-card"
              style={{ backgroundColor: c.color ?? undefined }}
            >
              <CardAttachments
                imageUrl={c.imageUrl}
                linkUrl={c.linkUrl}
                linkTitle={c.linkTitle}
                linkDesc={c.linkDesc}
                linkImage={c.linkImage}
                videoUrl={c.videoUrl}
              />
              <h4 className="padlet-card-title">{c.title}</h4>
              <p className="padlet-card-content">{c.content}</p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
