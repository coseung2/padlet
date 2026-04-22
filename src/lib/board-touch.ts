// Bumps Board.updatedAt as a best-effort side-effect of card/section mutations.
//
// Why a helper:
//   - classroom-boards-tab "🟢 새 활동" 배지는 Board.updatedAt vs localStorage
//     lastVisitedBoards[boardId]를 비교한다. Board 행 자체는 거의 update되지
//     않으므로 (title/layout/설정 변경 정도), @updatedAt만으로는 부족해서
//     카드/섹션 변경 시 명시적으로 parent board를 touch 해야 배지가 의미를
//     갖는다.
//
// 주의:
//   - 반드시 main mutation 트랜잭션 바깥에서 호출한다. touch 실패가 원래
//     작업을 롤백하면 안 된다 (best-effort).
//   - cascade delete로 board 자체가 사라진 경우 P2025(not found)가 날 수
//     있다 → .catch(() => {})로 흡수.
//   - classroomId가 없는 board(개인 보드)도 동일하게 touch한다. 교사가
//     나중에 학급에 연결할 때의 활동 신호로도 의미가 있다.
import { db } from "@/lib/db";

/**
 * Best-effort bump of `Board.updatedAt` to the current time.
 * Swallows errors (e.g. board was cascade-deleted in the same request).
 */
export async function touchBoardUpdatedAt(boardId: string): Promise<void> {
  try {
    await db.board.update({
      where: { id: boardId },
      data: { updatedAt: new Date() },
    });
  } catch {
    // Intentionally swallow — touch is decorative (activity badge only),
    // never block the main mutation's success path.
  }
}
