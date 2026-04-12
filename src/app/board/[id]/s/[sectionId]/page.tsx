import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentStudent } from "@/lib/student-auth";
import { viewSection, ForbiddenError, getBoardRole } from "@/lib/rbac";
import { SectionBreakoutView } from "@/components/SectionBreakoutView";

type PageParams = { id: string; sectionId: string };
type PageSearchParams = { token?: string };

export default async function BreakoutPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const { id: boardParam, sectionId } = await params;
  const { token } = await searchParams;

  // Resolve board first (supports slug or id in the route segment, like /board/[id]).
  const board = await db.board.findFirst({
    where: { OR: [{ id: boardParam }, { slug: boardParam }] },
    select: { id: true, title: true, classroomId: true },
  });
  if (!board) notFound();

  // Auth subjects in parallel.
  const [user, student] = await Promise.all([
    getCurrentUser().catch(() => null),
    getCurrentStudent(),
  ]);

  let section;
  try {
    section = await viewSection(sectionId, {
      userId: user?.id ?? null,
      studentClassroomId: student?.classroomId ?? null,
      token: token ?? null,
    });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return (
        <main className="board-page">
          <div className="forbidden-card">
            <h2>접근 불가</h2>
            <p>이 Breakout 섹션에 접근할 권한이 없습니다. 공유 링크가 만료됐거나 변경됐을 수 있어요.</p>
          </div>
        </main>
      );
    }
    throw e;
  }

  // Defence-in-depth: section must belong to the requested board.
  if (section.boardId !== board.id) notFound();

  // Section-scoped query — the whole point of Breakout. Other sections never
  // leak into this page's payload.
  const cards = await db.card.findMany({
    where: { sectionId: section.id },
    orderBy: { order: "asc" },
  });

  // Owner sees a "공유 관리" link.
  const role = user ? await getBoardRole(board.id, user.id) : null;
  const shareManagementHref = role === "owner"
    ? `/board/${board.id}/s/${section.id}/share`
    : null;

  return (
    <SectionBreakoutView
      boardId={board.id}
      boardTitle={board.title}
      sectionTitle={section.title}
      cards={cards.map((c) => ({
        id: c.id,
        title: c.title,
        content: c.content,
        color: c.color,
        imageUrl: c.imageUrl,
        linkUrl: c.linkUrl,
        linkTitle: c.linkTitle,
        linkDesc: c.linkDesc,
        linkImage: c.linkImage,
        videoUrl: c.videoUrl,
      }))}
      shareManagementHref={shareManagementHref}
    />
  );
}
