import "server-only";
import { db } from "./db";
import { getCurrentUser } from "./auth";
import { getCurrentStudent } from "./student-auth";
import { getCurrentParent } from "./parent-session";

// student-portfolio (2026-04-26): 학급 단위 권한 helper.
//
// 보드/섹션 단위 권한은 src/lib/rbac.ts 가 담당. 포트폴리오는 학급 학생
// 명단을 entry-point 로 쓰는 화면이라 별도 헬퍼.
//
// 3 viewer kind:
//   - student: 자기 학급 학생 명단 + 본인이 자랑해요 토글 가능
//   - parent: 활성 ParentChildLink 자녀 학급 + 자녀 카드 + 학급 자랑해요
//   - teacher_owner: User 가 보드 owner 인 학급 (= classroom.teacherId)
//
// 다른 학급 침범은 모든 kind 에서 차단. canViewStudent / canToggleShowcase
// 가 게이트 함수.

export type PortfolioViewer =
  | {
      kind: "student";
      id: string;
      name: string;
      classroomId: string;
    }
  | {
      kind: "parent";
      id: string;
      // 활성 ParentChildLink 의 자녀 ID 배열
      childIds: string[];
      // 자녀 학급 ID set (학급 자랑해요 가시 범위)
      childClassroomIds: string[];
    }
  | {
      kind: "teacher_owner";
      id: string;
      classroomIds: string[];
    };

/**
 * 현재 세션을 viewer 객체로 변환. teacher 가 우선 (NextAuth user 가 살아 있으면
 * student cookie 무시). teacher 도 parent 도 아니면 student 시도. 모두 실패면
 * null.
 */
export async function resolvePortfolioViewer(): Promise<PortfolioViewer | null> {
  // 1순위: NextAuth user (교사)
  const user = await getCurrentUser().catch(() => null);
  if (user) {
    const classrooms = await db.classroom.findMany({
      where: { teacherId: user.id },
      select: { id: true },
    });
    return {
      kind: "teacher_owner",
      id: user.id,
      classroomIds: classrooms.map((c) => c.id),
    };
  }

  // 2순위: parent session
  const parentCtx = await getCurrentParent();
  if (parentCtx) {
    const links = await db.parentChildLink.findMany({
      where: {
        parentId: parentCtx.parent.id,
        status: "active",
        deletedAt: null,
      },
      include: {
        student: { select: { id: true, classroomId: true } },
      },
    });
    const childIds = links.map((l) => l.studentId);
    const childClassroomIds = Array.from(
      new Set(links.map((l) => l.student.classroomId))
    );
    return {
      kind: "parent",
      id: parentCtx.parent.id,
      childIds,
      childClassroomIds,
    };
  }

  // 3순위: student session
  const student = await getCurrentStudent();
  if (student) {
    return {
      kind: "student",
      id: student.id,
      name: student.name,
      classroomId: student.classroomId,
    };
  }

  return null;
}

/**
 * viewer 가 targetStudent 의 포트폴리오를 볼 수 있는지.
 * - student: 같은 classroomId
 * - parent: targetStudent.id ∈ childIds (자녀 본인만)
 * - teacher_owner: targetStudent.classroomId ∈ classroomIds
 */
export function canViewStudent(
  viewer: PortfolioViewer,
  target: { id: string; classroomId: string }
): boolean {
  if (viewer.kind === "student") {
    return viewer.classroomId === target.classroomId;
  }
  if (viewer.kind === "parent") {
    return viewer.childIds.includes(target.id);
  }
  return viewer.classroomIds.includes(target.classroomId);
}

/**
 * viewer 가 학급 자랑해요 highlight 영역을 볼 수 있는지.
 * - student: 자기 학급
 * - parent: 자녀가 속한 학급
 * - teacher_owner: 자기 학급
 */
export function canViewClassroomShowcase(
  viewer: PortfolioViewer,
  classroomId: string
): boolean {
  if (viewer.kind === "student") return viewer.classroomId === classroomId;
  if (viewer.kind === "parent")
    return viewer.childClassroomIds.includes(classroomId);
  return viewer.classroomIds.includes(classroomId);
}

/**
 * student viewer 만 본인이 작성/공동작성한 카드 자랑해요를 토글 가능.
 * 카드 권한 가드:
 *   1. card.studentAuthorId === viewer.id (단일 작성자) OR
 *      viewer.id ∈ card.authors[].studentId (공동작성자)
 *   2. card.board.classroomId === viewer.classroomId (자기 학급 보드만)
 */
export type ShowcaseTogglable = {
  studentAuthorId: string | null;
  authors: Array<{ studentId: string | null }>;
  board: { classroomId: string | null };
};

export function canToggleShowcase(
  viewer: PortfolioViewer,
  card: ShowcaseTogglable
): boolean {
  if (viewer.kind !== "student") return false;
  if (card.board.classroomId !== viewer.classroomId) return false;
  if (card.studentAuthorId === viewer.id) return true;
  return card.authors.some((a) => a.studentId === viewer.id);
}
