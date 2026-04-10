import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Dashboard } from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  // Only show boards where the current user is a member
  const memberships = await db.boardMember.findMany({
    where: { userId: user.id },
    include: {
      board: {
        include: { _count: { select: { cards: true, members: true } } },
      },
    },
    orderBy: { board: { createdAt: "desc" } },
  });

  const boardItems = memberships.map((m) => ({
    id: m.board.id,
    slug: m.board.slug,
    title: m.board.title || "제목 없음",
    layout: m.board.layout,
    cardCount: m.board._count.cards,
    memberCount: m.board._count.members,
    role: m.role,
  }));

  return (
    <main className="home-page">
      <header className="home-header">
        <div className="home-header-top">
          <div>
            <h1 className="home-title">내 보드</h1>
            <p className="home-subtitle">{user.name}님의 보드</p>
          </div>
        </div>
      </header>
      <Dashboard boards={boardItems} />
    </main>
  );
}
