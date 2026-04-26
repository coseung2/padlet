// student-portfolio (2026-04-26): pure ACL helpers — server-only / Next 의
// 부수효과 없이 import 가능. 단위 테스트가 next-auth 모듈 그래프를 끌어올
// 필요 없도록 분리.
//
// session-resolving (resolvePortfolioViewer) 만 portfolio-acl.ts 에 둠.

// 학생 결과물 컨텍스트로 부적절한 board layout — 포트폴리오·자랑해요
// 어디서도 노출 X. 현재 dj-queue 만 제외 (음악 신청은 결과물 아님).
// 후속 layout 추가될 가능성 대비 set 형태.
export const EXCLUDED_BOARD_LAYOUTS = ["dj-queue"] as const;
export const EXCLUDED_BOARD_LAYOUT_SET: ReadonlySet<string> = new Set(
  EXCLUDED_BOARD_LAYOUTS
);

export function isPortfolioEligibleLayout(layout: string): boolean {
  return !EXCLUDED_BOARD_LAYOUT_SET.has(layout);
}

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
