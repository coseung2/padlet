// student-portfolio (2026-04-26): pure ACL helpers — server-only / Next 의
// 부수효과 없이 import 가능. 단위 테스트가 next-auth 모듈 그래프를 끌어올
// 필요 없도록 분리.
//
// session-resolving (resolvePortfolioViewer) 만 portfolio-acl.ts 에 둠.

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
      childIds: string[];
      childClassroomIds: string[];
    }
  | {
      kind: "teacher_owner";
      id: string;
      classroomIds: string[];
    };

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

export function canViewClassroomShowcase(
  viewer: PortfolioViewer,
  classroomId: string
): boolean {
  if (viewer.kind === "student") return viewer.classroomId === classroomId;
  if (viewer.kind === "parent")
    return viewer.childClassroomIds.includes(classroomId);
  return viewer.classroomIds.includes(classroomId);
}

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
