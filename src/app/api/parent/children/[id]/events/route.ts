import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withParentScopeForStudent } from "@/lib/parent-scope";

// PV-7 Events — parent read-only view of the child's EventSignup submissions.
//
// Scope guard: studentId ∈ parent.children (→ 403 on mismatch, AC-5).
//
// Filter logic (AC-13 — "EventBoard API allows classroomId query but strips
// other students' EventSignup records"):
//   1) Find all event boards reachable for the child's classroom:
//        accessMode IN ("public-link", "classroom")
//      (Event boards created via Seed 3 set accessMode to "public-link" in
//      most cases, but teachers can also create classroom-visible ones.)
//   2) Pull the board metadata so we can render event info (title, venue,
//      start/end, poster).
//   3) For each board, attach ONLY the child's own Submission rows, matched
//      by applicantName+applicantNumber. Other students' submissions must
//      not appear — AC-13.
// We return the boards list with each board's `mySubmissions: Submission[]`.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await ctx.params;
  return withParentScopeForStudent(req, studentId, async () => {
    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, number: true, classroomId: true },
    });
    if (!student) {
      return NextResponse.json({ events: [] });
    }

    // Pull child's own event submissions first (tight filter), then join
    // back to board rows. This avoids shipping a large "all classroom
    // event boards" payload when the child has no submissions — keeps the
    // payload well under the thumbnail budget for mobile.
    const mySubs = await db.submission.findMany({
      where: {
        applicantName: student.name,
        ...(student.number != null ? { applicantNumber: student.number } : {}),
        board: {
          classroomId: student.classroomId,
          accessMode: { in: ["public-link", "classroom"] },
          eventStart: { not: null }, // discriminate event boards
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        status: true,
        teamName: true,
        videoUrl: true,
        createdAt: true,
        updatedAt: true,
        board: {
          select: {
            id: true,
            title: true,
            slug: true,
            eventPosterUrl: true,
            eventStart: true,
            eventEnd: true,
            venue: true,
            applicationStart: true,
            applicationEnd: true,
            announceMode: true,
          },
        },
      },
    });

    // Group by board.id so the UI can render one card per event with nested
    // submissions.
    const grouped = new Map<string, {
      board: (typeof mySubs)[number]["board"];
      mySubmissions: Omit<(typeof mySubs)[number], "board">[];
    }>();
    for (const sub of mySubs) {
      const { board, ...rest } = sub;
      const entry = grouped.get(board.id) ?? { board, mySubmissions: [] };
      entry.mySubmissions.push(rest);
      grouped.set(board.id, entry);
    }

    return NextResponse.json({ events: Array.from(grouped.values()) });
  });
}
