import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getBoardRole } from "@/lib/rbac";
import { BoardCanvas } from "@/components/BoardCanvas";
import { GridBoard } from "@/components/GridBoard";
import { StreamBoard } from "@/components/StreamBoard";
import { ColumnsBoard } from "@/components/ColumnsBoard";
import { UserSwitcher } from "@/components/UserSwitcher";

export const dynamic = "force-dynamic";

const LAYOUT_LABEL: Record<string, string> = {
  freeform: "자유 배치",
  grid: "그리드",
  stream: "스트림",
  columns: "칼럼",
};

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const board = await db.board.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      cards: { orderBy: { order: "asc" } },
      sections: { orderBy: { order: "asc" } },
    },
  });
  if (!board) notFound();

  const user = await getCurrentUser();
  const role = await getBoardRole(board.id, user.id);

  const cardProps = board.cards.map((c) => ({
    id: c.id,
    title: c.title,
    content: c.content,
    color: c.color,
    x: c.x,
    y: c.y,
    width: c.width,
    height: c.height,
    order: c.order,
    sectionId: c.sectionId,
    authorId: c.authorId,
    createdAt: c.createdAt.toISOString(),
  }));

  const sectionProps = board.sections.map((s) => ({
    id: s.id,
    title: s.title,
    order: s.order,
  }));

  if (!role) {
    return (
      <main className="board-page">
        <BoardHeader title={board.title} layout={board.layout} mockRole={user.mockRole} />
        <div className="forbidden-card">
          <h2>접근 불가</h2>
          <p>{user.name}님은 이 보드의 멤버가 아닙니다.</p>
        </div>
      </main>
    );
  }

  function renderBoard() {
    const common = {
      boardId: board!.id,
      initialCards: cardProps,
      currentUserId: user.id,
      currentRole: role!,
    };

    switch (board!.layout) {
      case "grid":
        return <GridBoard {...common} />;
      case "stream":
        return <StreamBoard {...common} />;
      case "columns":
        return <ColumnsBoard {...common} initialSections={sectionProps} />;
      case "freeform":
      default:
        return <BoardCanvas {...common} />;
    }
  }

  return (
    <main className="board-page">
      <BoardHeader
        title={board.title}
        layout={board.layout}
        userName={user.name}
        userRole={role}
        mockRole={user.mockRole}
      />
      {renderBoard()}
    </main>
  );
}

function BoardHeader({
  title,
  layout,
  userName,
  userRole,
  mockRole,
}: {
  title: string;
  layout: string;
  userName?: string;
  userRole?: string;
  mockRole: string;
}) {
  return (
    <header className="board-header">
      <div className="board-header-left">
        <Link href="/" className="board-back-link" aria-label="보드 목록으로">
          ←
        </Link>
        <h1 className="board-title">{title}</h1>
        <span className="board-layout-badge">{LAYOUT_LABEL[layout] ?? layout}</span>
        {userName && userRole && (
          <span className="board-badge">
            {userName} · {userRole}
          </span>
        )}
      </div>
      <div className="board-header-right">
        <UserSwitcher currentRole={mockRole} />
      </div>
    </header>
  );
}
