import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  canViewClassroomShowcase,
  resolvePortfolioViewer,
} from "@/lib/portfolio-acl";
import { mapPortfolioCard } from "@/lib/portfolio-card-mapper";
import type { ShowcaseEntryDTO } from "@/lib/portfolio-dto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/showcase/classroom/:classroomId
//
// 학급 메인 dashboard highlight 영역에 띄울 자랑해요 목록. createdAt DESC
// LIMIT 30. 페이지네이션은 v2.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  const { classroomId } = await params;
  const viewer = await resolvePortfolioViewer();
  if (!viewer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!canViewClassroomShowcase(viewer, classroomId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const viewerStudentId = viewer.kind === "student" ? viewer.id : null;

  const entries = await db.showcaseEntry.findMany({
    where: { classroomId },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      student: { select: { id: true, name: true, number: true } },
      card: {
        include: {
          board: {
            select: { id: true, slug: true, title: true, layout: true },
          },
          section: { select: { id: true, title: true } },
          attachments: { orderBy: { order: "asc" } },
          showcaseEntries: { select: { studentId: true } },
        },
      },
    },
  });

  const dto: ShowcaseEntryDTO[] = entries.map((e) => ({
    cardId: e.cardId,
    studentId: e.studentId,
    studentName: e.student.name,
    studentNumber: e.student.number,
    card: mapPortfolioCard(e.card, viewerStudentId),
    createdAt: e.createdAt.toISOString(),
  }));

  return NextResponse.json({ entries: dto });
}
