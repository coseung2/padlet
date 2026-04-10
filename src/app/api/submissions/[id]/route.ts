import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission, ForbiddenError } from "@/lib/rbac";

const PatchSubmissionSchema = z.object({
  status: z.enum(["submitted", "reviewed", "returned"]).optional(),
  feedback: z.string().max(2000).nullable().optional(),
  grade: z.string().max(50).nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const submission = await db.submission.findUnique({
      where: { id },
      include: { section: true },
    });
    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Only owner (teacher) can review/grade
    await requirePermission(submission.section.boardId, user.id, "edit");

    const body = await req.json();
    const input = PatchSubmissionSchema.parse(body);
    const updated = await db.submission.update({ where: { id }, data: input });

    return NextResponse.json({ submission: updated });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[PATCH /api/submissions/:id]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
