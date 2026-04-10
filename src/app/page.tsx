import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const LAYOUT_EMOJI: Record<string, string> = {
  freeform: "🎯",
  grid: "🔲",
  stream: "📜",
  columns: "📊",
};

const LAYOUT_LABEL: Record<string, string> = {
  freeform: "자유 배치",
  grid: "그리드",
  stream: "스트림",
  columns: "칼럼",
};

export default async function HomePage() {
  const boards = await db.board.findMany({
    include: { _count: { select: { cards: true, members: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="home-page">
      <header className="home-header">
        <h1 className="home-title">내 보드</h1>
        <p className="home-subtitle">보드를 선택해서 열어보세요</p>
      </header>
      <div className="board-list">
        {boards.map((b) => (
          <Link key={b.id} href={`/board/${b.slug}`} className="board-list-card">
            <span className="board-list-emoji">{LAYOUT_EMOJI[b.layout] ?? "📋"}</span>
            <div className="board-list-info">
              <h2 className="board-list-title">{b.title}</h2>
              <p className="board-list-meta">
                {LAYOUT_LABEL[b.layout] ?? b.layout} · 카드 {b._count.cards}개 · 멤버 {b._count.members}명
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
