import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getBoardRole } from "@/lib/rbac";
import { BoardCanvas } from "@/components/BoardCanvas";
import { GridBoard } from "@/components/GridBoard";
import { StreamBoard } from "@/components/StreamBoard";
import { ColumnsBoard } from "@/components/ColumnsBoard";
import { AssignmentBoard } from "@/components/AssignmentBoard";
import { QuizBoard, type QuizData } from "@/components/QuizBoard";
import { UserSwitcher } from "@/components/UserSwitcher";
import { AuthHeader } from "@/components/AuthHeader";
import { EditableTitle } from "@/components/EditableTitle";

export const dynamic = "force-dynamic";

const LAYOUT_LABEL: Record<string, string> = {
  freeform: "자유 배치",
  grid: "그리드",
  stream: "스트림",
  columns: "칼럼",
  assignment: "과제 배부",
  quiz: "퀴즈",
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
      submissions: true,
      members: { include: { user: true } },
      quizzes: {
        include: { questions: { orderBy: { order: "asc" } }, players: true },
        orderBy: { createdAt: "desc" },
      },
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
    imageUrl: c.imageUrl,
    linkUrl: c.linkUrl,
    linkTitle: c.linkTitle,
    linkDesc: c.linkDesc,
    linkImage: c.linkImage,
    videoUrl: c.videoUrl,
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
        <BoardHeader title={board.title} layout={board.layout} mockRole={user.mockRole} canEdit={false} />
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
      case "assignment":
        return (
          <AssignmentBoard
            boardId={board!.id}
            description={board!.description}
            initialSubmissions={board!.submissions.map((sub) => ({
              id: sub.id,
              boardId: sub.boardId,
              userId: sub.userId,
              content: sub.content,
              linkUrl: sub.linkUrl,
              fileUrl: sub.fileUrl,
              status: sub.status,
              feedback: sub.feedback,
              grade: sub.grade,
              createdAt: sub.createdAt.toISOString(),
            }))}
            members={board!.members.map((m) => ({
              userId: m.userId,
              userName: m.user.name,
              role: m.role,
            }))}
            currentUserId={user.id}
            currentRole={role!}
          />
        );
      case "quiz": {
        const answerToIndex: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
        return (
          <QuizBoard
            boardId={board!.id}
            quizzes={board!.quizzes.map((q) => ({
              id: q.id,
              title: q.title,
              roomCode: q.roomCode,
              status: q.status as "waiting" | "active" | "finished",
              currentQuestionIndex: q.currentQ,
              questions: q.questions.map((qn) => ({
                id: qn.id,
                text: qn.question,
                options: [qn.optionA, qn.optionB, qn.optionC, qn.optionD],
                correctIndex: answerToIndex[qn.answer] ?? 0,
                timeLimit: qn.timeLimit,
              })),
              players: q.players.map((p) => ({
                id: p.id,
                nickname: p.nickname,
                score: p.score,
              })),
            }))}
          />
        );
      }
      case "freeform":
      default:
        return <BoardCanvas {...common} />;
    }
  }

  return (
    <main className="board-page">
      <BoardHeader
        boardId={board.id}
        title={board.title}
        layout={board.layout}
        userName={user.name}
        userRole={role}
        mockRole={user.mockRole}
        canEdit={role === "owner" || role === "editor"}
      />
      {renderBoard()}
    </main>
  );
}

function BoardHeader({
  boardId,
  title,
  layout,
  userName,
  userRole,
  mockRole,
  canEdit,
}: {
  boardId?: string;
  title: string;
  layout: string;
  userName?: string;
  userRole?: string;
  mockRole: string | null;
  canEdit: boolean;
}) {
  return (
    <header className="board-header">
      <div className="board-header-left">
        <Link href="/" className="board-back-link" aria-label="보드 목록으로">
          ←
        </Link>
        {boardId ? (
          <EditableTitle boardId={boardId} initialTitle={title} canEdit={canEdit} />
        ) : (
          <h1 className="board-title">{title}</h1>
        )}
        <span className="board-layout-badge">{LAYOUT_LABEL[layout] ?? layout}</span>
        {userName && userRole && (
          <span className="board-badge">
            {userName} · {userRole}
          </span>
        )}
      </div>
      <div className="board-header-right">
        <AuthHeader />
        {mockRole && <UserSwitcher currentRole={mockRole} />}
      </div>
    </header>
  );
}
