import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Dashboard } from "@/components/Dashboard";
import { AuthHeader } from "@/components/AuthHeader";
import { UserSwitcher } from "@/components/UserSwitcher";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    redirect("/login");
  }

  // Independent queries → run in parallel.
  const [memberships, classrooms] = await Promise.all([
    // Only show boards where the current user is a member
    db.boardMember.findMany({
      where: { userId: user.id },
      include: {
        board: {
          include: { _count: { select: { cards: true, members: true } } },
        },
      },
      orderBy: { board: { createdAt: "desc" } },
    }),
    // Fetch classrooms for board creation modal
    db.classroom.findMany({
      where: { teacherId: user.id },
      include: { _count: { select: { students: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const classroomItems = classrooms.map((c) => ({
    id: c.id,
    name: c.name,
    studentCount: c._count.students,
  }));

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
          <div className="home-header-actions">
            <AuthHeader />
            {user.mockRole && <UserSwitcher currentRole={user.mockRole} />}
          </div>
        </div>
      </header>
      <Dashboard boards={boardItems} classrooms={classroomItems} />
    </main>
  );
}
