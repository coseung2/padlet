import { db } from "./db";
import type { Identities } from "./card-permissions";

/**
 * Teacher-scoped quiz management check (quiz-extensions B1/B3/B4).
 *
 * A teacher may manage a quiz iff they own the board that quiz lives
 * on. No separate Quiz.createdById column — ownership of the quiz
 * derives from ownership of the host board (classroom teacher).
 *
 * Students and parents always return false — quiz management is
 * teacher-only. Use canAddCardToBoard for draft/create (board-level).
 */
export async function canManageQuiz(
  quizId: string,
  ids: Identities
): Promise<boolean> {
  if (!ids.teacher) return false;
  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    select: { boardId: true },
  });
  if (!quiz) return false;
  return ids.teacher.ownsBoardIds.has(quiz.boardId);
}
