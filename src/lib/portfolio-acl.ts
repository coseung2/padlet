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
// 등 pure 함수는 portfolio-acl-pure.ts (테스트 가능). 이 파일은 session
// resolving 만 담당.

export {
  canViewStudent,
  canViewClassroomShowcase,
  canToggleShowcase,
  type PortfolioViewer,
  type ShowcaseTogglable,
} from "./portfolio-acl-pure";
import type { PortfolioViewer } from "./portfolio-acl-pure";

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
