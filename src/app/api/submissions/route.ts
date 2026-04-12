import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission, ForbiddenError } from "@/lib/rbac";

const CreateSubmissionSchema = z.object({
  boardId: z.string().min(1),
  content: z.string().max(5000).default(""),
  linkUrl: z.string().url().nullable().optional(),
  fileUrl: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const input = CreateSubmissionSchema.parse(body);

    await requirePermission(input.boardId, user.id, "edit");

    // Assignment path: unique(boardId,userId) used to guarantee one submission
    // per student. The compound unique was removed in ES-1 to accommodate
    // public event-signup submissions (userId null). Re-assert uniqueness at
    // the app layer via findFirst-then-update/create.
    const existing = await db.submission.findFirst({
      where: { boardId: input.boardId, userId: user.id },
    });
    const submission = existing
      ? await db.submission.update({
          where: { id: existing.id },
          data: {
            content: input.content,
            linkUrl: input.linkUrl ?? null,
            fileUrl: input.fileUrl ?? null,
            status: "submitted",
          },
        })
      : await db.submission.create({
          data: {
            boardId: input.boardId,
            userId: user.id,
            content: input.content,
            linkUrl: input.linkUrl ?? null,
            fileUrl: input.fileUrl ?? null,
            status: "submitted",
          },
        });

    return NextResponse.json({ submission });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[POST /api/submissions]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
