import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withParentScopeForStudent } from "@/lib/parent-scope";

// PV-7 Assignments — parent read-only view.
//
// AB-1 refinement (2026-04-15): when the board uses the AssignmentSlot
// entity we join through the slot directly (`slot.studentId === child.id`),
// surfacing assignmentSlotId + returnReason + submissionStatus alongside the
// legacy Submission row. Legacy event-signup boards with applicantName-based
// matching continue to resolve through the original heuristic.

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

    // Branch 1: AssignmentSlot-backed rows (assignment-board v2).
    const slotRows = await db.assignmentSlot.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
      include: {
        board: { select: { id: true, title: true, slug: true } },
        submission: {
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
          },
        },
      },
    });
    const slotBoardIds = new Set(slotRows.map((r) => r.boardId));

    const slotSubmissions = slotRows.map((row) => ({
      id: row.submission?.id ?? `slot-${row.id}`,
      content: row.submission?.content ?? "",
      linkUrl: row.submission?.linkUrl ?? null,
      fileUrl: row.submission?.fileUrl ?? null,
      // Prefer AssignmentSlot.submissionStatus — Submission.status is a
      // legacy mirror and doesn't track returnedAt/viewed transitions.
      status: row.submissionStatus,
      // For assignment boards the return reason lives on the slot, not on
      // Submission.feedback (Submission.feedback stays populated only for
      // the legacy BoardMember-based review flow).
      feedback: row.submission?.feedback ?? null,
      grade: row.grade ?? row.submission?.grade ?? null,
      createdAt: (row.submission?.createdAt ?? row.createdAt).toISOString(),
      updatedAt: (row.submission?.updatedAt ?? row.updatedAt).toISOString(),
      board: row.board,
      assignmentSlotId: row.id,
      submissionStatus: row.submissionStatus,
      returnReason: row.returnReason ?? null,
    }));

    // Branch 2: legacy applicant-field match. Exclude boards that already
    // surfaced via AssignmentSlot to avoid double-counting.
    const legacyRaw = await db.submission.findMany({
      where: {
        board: {
          classroomId: student.classroomId,
          accessMode: "classroom",
          id: { notIn: Array.from(slotBoardIds) },
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
    const legacy = legacyRaw.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      assignmentSlotId: null as string | null,
      submissionStatus: null as string | null,
      returnReason: null as string | null,
    }));

    const submissions = [...slotSubmissions, ...legacy].sort((a, b) =>
      a.updatedAt < b.updatedAt ? 1 : -1
    );
    return NextResponse.json({ submissions });
  });
}
