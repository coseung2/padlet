import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withParentScopeForStudent } from "@/lib/parent-scope";

// PV-7 Assignments — parent read-only view of the child's assignment
// Submissions.
//
// NOTE on Submission ↔ Student mapping: the Submission table has no FK to
// Student. Instead it carries:
//   - `userId` (NextAuth User) for classroom-logged-in assignment path
//   - `applicantName` + `applicantNumber` (applicant fields) for event paths
//
// Since Student rows also don't carry a userId link, the only reliable
// match here is applicant fields. We match the child's student record's
// `name` + `number` within the classroom's boards (Board.classroomId).
// This is approximate (homonyms are possible) but:
//   - the parent only ever sees submissions inside their child's classroom
//   - applicantNumber is the attendance #, which is unique per classroom
//   - we exclude event-signup boards (accessMode=public-link) here — those
//     belong to the /events tab. So status values are {submitted, reviewed,
//     returned}, not the event approval ones.
//
// Known limitation: if the teacher never collected applicant fields for a
// board (assignment board w/ login-only users), those submissions will not
// surface here. Documented in scope_decision risk ledger.

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
      return NextResponse.json({ submissions: [] });
    }
    const submissions = await db.submission.findMany({
      where: {
        board: {
          classroomId: student.classroomId,
          accessMode: "classroom", // exclude event-signup boards (events tab)
        },
        applicantName: student.name,
        ...(student.number != null ? { applicantNumber: student.number } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        linkUrl: true,
        fileUrl: true,
        status: true,
        feedback: true,
        grade: true,
        createdAt: true,
        updatedAt: true,
        board: { select: { id: true, title: true, slug: true } },
      },
    });
    return NextResponse.json({ submissions });
  });
}
