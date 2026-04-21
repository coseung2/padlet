// Shared layout for every /classroom/[id]/* page. Renders:
//   1. 뒤로가기 "← 학급 목록" link
//   2. <ClassroomPageNav> — 7-tab handoff nav (single source of truth)
//   3. page body (children)
//
// This replaces the old per-page `<ClassroomNav />` usage. Each page.tsx
// still owns its own classroom header (classroom name + meta / invite
// card), because fetching those here would require passing the data as a
// context and /students already has ClassroomDetail doing the work.

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ClassroomPageNav } from "@/components/classroom/ClassroomPageNav";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function ClassroomDetailLayout({
  children,
  params,
}: LayoutProps) {
  const { id } = await params;
  const classroom = await db.classroom.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!classroom) notFound();

  return (
    <main className="classroom-page classroom-page-detail">
      <a href="/classroom" className="classroom-back-link">
        &larr; 학급 목록
      </a>
      <ClassroomPageNav classroomId={classroom.id} />
      {children}
    </main>
  );
}
