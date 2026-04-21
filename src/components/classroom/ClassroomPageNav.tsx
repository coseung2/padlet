"use client";

// Unified nav for every /classroom/[id]/* page — supersedes ClassroomNav.
// Renders the handoff classroom-tabs (7 tabs) at the top of the shared
// layout so every sub-page (학생 명단/학부모 연결/보드/설정 → /students
// tab-switched; 학급 역할/은행/매점 → own routes) shows the same row.
//
// The 4 "state tabs" (students/parents/boards/settings) all resolve to
// concrete routes: /students itself (+ ?tab=parents|settings query to
// switch ClassroomDetail's internal tab) or /boards. The 3 "link tabs"
// jump to the feature-rich /roles, /bank, /store pages.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Props = {
  classroomId: string;
};

type ActiveKey =
  | "students"
  | "parents"
  | "boards"
  | "settings"
  | "roles"
  | "bank"
  | "store";

function useActive(classroomId: string): ActiveKey | null {
  const pathname = usePathname() ?? "";
  const search = useSearchParams();
  const base = `/classroom/${classroomId}`;

  if (pathname === `${base}/boards` || pathname.startsWith(`${base}/boards/`)) {
    return "boards";
  }
  if (pathname === `${base}/roles` || pathname.startsWith(`${base}/roles/`)) {
    return "roles";
  }
  if (
    pathname === `${base}/bank` ||
    pathname.startsWith(`${base}/bank/`) ||
    pathname === `${base}/pay` ||
    pathname.startsWith(`${base}/pay/`)
  ) {
    // /pay is the POS flow launched from /bank; keep 은행 tab highlighted
    // so the teacher sees they're still inside the bank surface.
    return "bank";
  }
  if (pathname === `${base}/store` || pathname.startsWith(`${base}/store/`)) {
    return "store";
  }
  if (
    pathname === `${base}/parent-access` ||
    pathname.startsWith(`${base}/parent-access/`)
  ) {
    return "parents";
  }
  // Default: /students (base page or /plant-matrix etc. fall here)
  const tabQ = search?.get("tab");
  if (tabQ === "parents") return "parents";
  if (tabQ === "settings") return "settings";
  if (tabQ === "boards") return "boards";
  return "students";
}

export function ClassroomPageNav({ classroomId }: Props) {
  const active = useActive(classroomId);
  const base = `/classroom/${classroomId}`;

  return (
    <nav className="classroom-tabs" aria-label="학급 관리 탭">
      <Link
        href={`${base}/students`}
        className={`classroom-tab${active === "students" ? " is-active" : ""}`}
        aria-current={active === "students" ? "page" : undefined}
      >
        학생 명단
      </Link>
      <Link
        href={`${base}/students?tab=parents`}
        className={`classroom-tab${active === "parents" ? " is-active" : ""}`}
        aria-current={active === "parents" ? "page" : undefined}
      >
        학부모 연결
      </Link>
      <Link
        href={`${base}/boards`}
        className={`classroom-tab${active === "boards" ? " is-active" : ""}`}
        aria-current={active === "boards" ? "page" : undefined}
      >
        공유된 보드
      </Link>
      <Link
        href={`${base}/students?tab=settings`}
        className={`classroom-tab${active === "settings" ? " is-active" : ""}`}
        aria-current={active === "settings" ? "page" : undefined}
      >
        설정
      </Link>

      <span className="classroom-tabs-sep" aria-hidden="true" />

      <Link
        href={`${base}/roles`}
        className={`classroom-tab classroom-tab-link${active === "roles" ? " is-active" : ""}`}
        aria-current={active === "roles" ? "page" : undefined}
      >
        학급 역할
      </Link>
      <Link
        href={`${base}/bank`}
        className={`classroom-tab classroom-tab-link${active === "bank" ? " is-active" : ""}`}
        aria-current={active === "bank" ? "page" : undefined}
      >
        은행
      </Link>
      <Link
        href={`${base}/store`}
        className={`classroom-tab classroom-tab-link${active === "store" ? " is-active" : ""}`}
        aria-current={active === "store" ? "page" : undefined}
      >
        매점
      </Link>
    </nav>
  );
}
