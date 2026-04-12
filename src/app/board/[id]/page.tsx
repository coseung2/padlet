import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentStudent } from "@/lib/student-auth";
import { getBoardRole, type Role } from "@/lib/rbac";
import { BoardCanvas } from "@/components/BoardCanvas";
import { GridBoard } from "@/components/GridBoard";
import { StreamBoard } from "@/components/StreamBoard";
import { ColumnsBoard } from "@/components/ColumnsBoard";
import { AssignmentBoard } from "@/components/AssignmentBoard";
import { QuizBoard, type QuizData } from "@/components/QuizBoard";
import { UserSwitcher } from "@/components/UserSwitcher";
import { AuthHeader } from "@/components/AuthHeader";
import { EditableTitle } from "@/components/EditableTitle";

// Auth + cookie reads already flag this route as dynamic.
// Dropping the explicit flag keeps the Router Cache warm for navigations.

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

  // Round 1 — resolve the board itself plus auth subjects concurrently.
  const [board, user, student] = await Promise.all([
    db.board.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    }),
    getCurrentUser().catch(() => null),
    getCurrentStudent(),
  ]);
  if (!board) notFound();

  // Round 2 — fan out every dependent query that this layout actually renders.
  // - Card-rendering layouts (freeform / grid / stream / columns) skip
  //   submissions, members, and quizzes.
  // - Assignment boards skip cards + sections; quiz boards skip them too.
  // - Sections are only read by the columns layout — others skip.
  const needsAssignmentData = board.layout === "assignment";
  const needsQuizData = board.layout === "quiz";
  const needsCards = !needsAssignmentData && !needsQuizData;
  const needsSections = board.layout === "columns";

  const cardsPromise = needsCards
    ? db.card.findMany({
        where: { boardId: board.id },
        orderBy: { order: "asc" },
      })
    : null;
  const sectionsPromise = needsSections
    ? db.section.findMany({
        where: { boardId: board.id },
        orderBy: { order: "asc" },
      })
    : null;
  const submissionsPromise = needsAssignmentData
    ? db.submission.findMany({ where: { boardId: board.id } })
    : null;
  const membersPromise = needsAssignmentData
    ? db.boardMember.findMany({
        where: { boardId: board.id },
        include: { user: true },
      })
    : null;
  const quizzesPromise = needsQuizData
    ? db.quiz.findMany({
        where: { boardId: board.id },
        include: { questions: { orderBy: { order: "asc" } }, players: true },
        orderBy: { createdAt: "desc" },
      })
    : null;
  const rolePromise: Promise<Role | null> = user
    ? getBoardRole(board.id, user.id)
    : Promise.resolve(null);

  const [cardsRaw, sectionsRaw, submissionsRaw, membersRaw, quizzesRaw, role] = await Promise.all([
    cardsPromise,
    sectionsPromise,
    submissionsPromise,
    membersPromise,
    quizzesPromise,
    rolePromise,
  ]);

  const cards = cardsRaw ?? [];
  const sections = sectionsRaw ?? [];
  const submissions = submissionsRaw ?? [];
  const members = membersRaw ?? [];
  const quizzes = quizzesRaw ?? [];

  // Student viewer fallback when the teacher/NextAuth path didn't grant a role.
  let studentViewer: { id: string; name: string; classroomId: string } | null = null;
  let effectiveRole: Role | null = role;
  if (
    !effectiveRole &&
    student &&
    board.classroomId &&
    student.classroomId === board.classroomId
  ) {
    studentViewer = {
      id: student.id,
      name: student.name,
      classroomId: student.classroomId,
    };
    effectiveRole = "viewer";
  }

  // Determine the effective user id and display name
  const effectiveUserId = studentViewer?.id ?? user?.id ?? "";
  const effectiveUserName = studentViewer?.name ?? user?.name ?? "";
  const mockRole = user?.mockRole ?? null;

  const cardProps = cards.map((c) => ({
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

  const sectionProps = sections.map((s) => ({
    id: s.id,
    title: s.title,
    order: s.order,
  }));

  if (!effectiveRole) {
    return (
      <main className="board-page">
        <BoardHeader title={board.title} layout={board.layout} mockRole={mockRole} canEdit={false} />
        <div className="forbidden-card">
          <h2>접근 불가</h2>
          <p>이 보드에 접근할 권한이 없습니다.</p>
        </div>
      </main>
    );
  }

  function renderBoard() {
    const common = {
      boardId: board!.id,
      initialCards: cardProps,
      currentUserId: effectiveUserId,
      currentRole: effectiveRole!,
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
            initialSubmissions={submissions.map((sub) => ({
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
            members={members.map((m) => ({
              userId: m.userId,
              userName: m.user.name,
              role: m.role,
            }))}
            currentUserId={effectiveUserId}
            currentRole={effectiveRole!}
          />
        );
      case "quiz": {
        const answerToIndex: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
        return (
          <QuizBoard
            boardId={board!.id}
            quizzes={quizzes.map((q) => ({
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
        userName={effectiveUserName}
        userRole={effectiveRole}
        mockRole={mockRole}
        canEdit={effectiveRole === "owner" || effectiveRole === "editor"}
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
