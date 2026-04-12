import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getBoardRole } from "@/lib/rbac";
import { SectionShareClient } from "@/components/SectionShareClient";

type PageParams = { id: string; sectionId: string };

export default async function SectionSharePage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { id: boardParam, sectionId } = await params;

  const board = await db.board.findFirst({
    where: { OR: [{ id: boardParam }, { slug: boardParam }] },
    select: { id: true, title: true },
  });
  if (!board) notFound();

  const section = await db.section.findUnique({ where: { id: sectionId } });
  if (!section || section.boardId !== board.id) notFound();

  const user = await getCurrentUser().catch(() => null);
  const role = user ? await getBoardRole(board.id, user.id) : null;

  if (role !== "owner") {
    return (
      <main className="board-page">
        <div className="forbidden-card">
          <h2>접근 불가</h2>
          <p>공유 링크는 보드 소유자만 관리할 수 있습니다.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="board-page">
      <header className="board-header">
        <div className="board-header-left">
          <Link href={`/board/${board.id}/s/${section.id}`} className="board-back-link" aria-label="Breakout 보기로">
            ←
          </Link>
          <h1 className="board-title">공유 관리</h1>
          <span className="board-layout-badge">{section.title}</span>
        </div>
      </header>

      <div className="breakout-header">
        <span className="breakout-breadcrumb">{board.title} › {section.title}</span>
      </div>

      <SectionShareClient
        boardId={board.id}
        sectionId={section.id}
        initialToken={section.accessToken}
      />
    </main>
  );
}
