import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentStudent } from "@/lib/student-auth";
import { StudentSubmitSchema } from "@/lib/assignment-schemas";
import type {
  AssignmentSubmissionStatus,
  AssignmentGradingStatus,
} from "@/lib/assignment-schemas";
import { canStudentSubmit, computeStudentSubmit } from "@/lib/assignment-state";
import { slotRowToDTO, SLOT_INCLUDE_DEFAULT } from "@/lib/assignment-api";
import { assignmentChannelKey, publish } from "@/lib/realtime";
import { resizeToWebPThumbUrl } from "@/lib/blob";
import { touchBoardUpdatedAt } from "@/lib/board-touch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: slotId } = await ctx.params;
  const student = await getCurrentStudent();
  if (!student) {
    return NextResponse.json({ error: "student_auth_required" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = StudentSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", detail: parsed.error.issues[0]?.message },
      { status: 400 }
    );
  }

  const slot = await db.assignmentSlot.findUnique({
    where: { id: slotId },
    include: {
      board: {
        select: { id: true, assignmentAllowLate: true, assignmentDeadline: true },
      },
    },
  });
  if (!slot) return NextResponse.json({ error: "slot_not_found" }, { status: 404 });
  if (slot.studentId !== student.id) {
    return NextResponse.json({ error: "slot_not_mine" }, { status: 403 });
  }
  if (slot.submissionStatus === "orphaned") {
    return NextResponse.json({ error: "orphaned_slot" }, { status: 409 });
  }
  const allowed = canStudentSubmit(
    {
      submissionStatus: slot.submissionStatus as AssignmentSubmissionStatus,
      gradingStatus: slot.gradingStatus as AssignmentGradingStatus,
    },
    {
      assignmentAllowLate: slot.board.assignmentAllowLate,
      assignmentDeadline: slot.board.assignmentDeadline,
    }
  );
  if (!allowed) {
    return NextResponse.json({ error: "submission_locked" }, { status: 403 });
  }

  const transition = computeStudentSubmit(slot.submissionStatus as AssignmentSubmissionStatus);
  if (!transition.ok) {
    return NextResponse.json({ error: "invalid_transition" }, { status: 409 });
  }

  const { content, linkUrl, fileUrl, imageUrl } = parsed.data;
  const now = new Date();

  // AC-12: when the student submits a new imageUrl, derive a 160×120 WebP
  // thumbnail and persist it alongside. Failure is non-fatal — we fall
  // back to null so slotRowToDTO will serve the original imageUrl.
  let thumbUrl: string | null | undefined = undefined;
  if (imageUrl !== undefined) {
    try {
      thumbUrl = await resizeToWebPThumbUrl(
        imageUrl,
        `assignment-thumbs/${slot.boardId}/${slot.cardId}.webp`
      );
    } catch (e) {
      console.warn(
        `[AssignmentSlot] thumb generation failed slotId=${slot.id}`,
        e
      );
      thumbUrl = null;
    }
  }

  const updated = await db.$transaction(async (tx) => {
    await tx.card.update({
      where: { id: slot.cardId },
      data: {
        ...(content !== undefined ? { content } : {}),
        ...(linkUrl !== undefined ? { linkUrl } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        ...(thumbUrl !== undefined ? { thumbUrl } : {}),
      },
    });

    // Submission.userId stays null for student submissions — assignmentSlotId
    // is the canonical identity anchor (NextAuth User ≠ Student row).
    await tx.submission.upsert({
      where: { assignmentSlotId: slot.id },
      create: {
        boardId: slot.boardId,
        userId: null,
        assignmentSlotId: slot.id,
        content: content ?? "",
        linkUrl: linkUrl ?? null,
        fileUrl: fileUrl ?? null,
        status: "submitted",
      },
      update: {
        content: content ?? "",
        linkUrl: linkUrl ?? null,
        fileUrl: fileUrl ?? null,
        status: "submitted",
        updatedAt: now,
      },
    });

    return tx.assignmentSlot.update({
      where: { id: slot.id },
      data: {
        submissionStatus: transition.next,
        // Reset grading state when the student resubmits after a return,
        // matching data_model.md §1.4 "returned → submitted" row.
        ...(slot.submissionStatus === "returned"
          ? { gradingStatus: "not_graded", returnedAt: null, returnReason: null }
          : {}),
      },
      include: SLOT_INCLUDE_DEFAULT,
    });
  });

  console.log(
    `[AssignmentSlot] transition slotId=${slot.id} from=${slot.submissionStatus} to=${updated.submissionStatus} actor=student actorId=${student.id}`
  );

  // classroom-boards-tab "🟢 새 활동" 배지 — 과제 제출로 slot card 내용 변경.
  await touchBoardUpdatedAt(slot.boardId);

  await publish({
    channel: assignmentChannelKey(slot.boardId),
    type: "slot.updated",
    payload: {
      slotId: updated.id,
      submissionStatus: updated.submissionStatus,
      gradingStatus: updated.gradingStatus,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });

  return NextResponse.json({ slot: slotRowToDTO(updated) });
}
