/**
 * POST /api/breakout/assignments/[id]/copy-card (BR-4)
 *
 * Body: { sourceCardId: string }
 *
 * Explicit single-shot action — copies `sourceCardId` into EVERY group-copy
 * section of the assignment (excluding the teacher-pool section). No
 * background reference/link — the copies are independent rows (decisions Q6).
 *
 * Permission: board owner only (teacher).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { cloneStructure, TemplateStructure } from "@/lib/breakout";

const Body = z.object({
  sourceCardId: z.string().min(1),
});

function sharedSectionTitles(structure: TemplateStructure): Set<string> {
  const s = new Set<string>();
  if (structure.sharedSections) {
    for (const row of structure.sharedSections) s.add(row.title);
  }
  return s;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await ctx.params;
    const user = await getCurrentUser();
    const body = await req.json();
    const input = Body.parse(body);

    const assignment = await db.breakoutAssignment.findUnique({
      where: { id: assignmentId },
      include: { template: true },
    });
    if (!assignment) {
      return NextResponse.json({ error: "assignment_not_found" }, { status: 404 });
    }

    // Teacher-only action — require owner role on the board.
    const role = await requirePermission(assignment.boardId, user.id, "edit");
    if (role !== "owner") {
      throw new ForbiddenError("Only the board owner can bulk-copy cards");
    }

    const sourceCard = await db.card.findUnique({
      where: { id: input.sourceCardId },
    });
    if (!sourceCard || sourceCard.boardId !== assignment.boardId) {
      return NextResponse.json({ error: "card_not_found" }, { status: 404 });
    }

    // Identify teacher-pool sections by title match against the template's
    // sharedSections spec (set at creation time; decisions Q6 permits this
    // because templates never retroactively mutate boards).
    const structure = cloneStructure(assignment.template.structure);
    const poolTitles = sharedSectionTitles(structure);

    const allSections = await db.section.findMany({
      where: { boardId: assignment.boardId },
      select: { id: true, title: true },
    });
    const groupSectionIds = allSections
      .filter((s) => !poolTitles.has(s.title))
      .map((s) => s.id);

    if (groupSectionIds.length === 0) {
      return NextResponse.json({ error: "no_group_sections" }, { status: 400 });
    }

    const createdCards = await db.$transaction(async (tx) => {
      const cards = [] as Awaited<ReturnType<typeof tx.card.create>>[];
      for (const sectionId of groupSectionIds) {
        // Skip the source section to avoid duplicating into the origin.
        if (sectionId === sourceCard.sectionId) continue;
        const maxOrder = await tx.card.aggregate({
          where: { sectionId },
          _max: { order: true },
        });
        const c = await tx.card.create({
          data: {
            boardId: assignment.boardId,
            sectionId,
            authorId: user.id,
            title: sourceCard.title,
            content: sourceCard.content,
            color: sourceCard.color,
            imageUrl: sourceCard.imageUrl,
            linkUrl: sourceCard.linkUrl,
            linkTitle: sourceCard.linkTitle,
            linkDesc: sourceCard.linkDesc,
            linkImage: sourceCard.linkImage,
            videoUrl: sourceCard.videoUrl,
            x: 0,
            y: 0,
            width: sourceCard.width,
            height: sourceCard.height,
            order: (maxOrder._max.order ?? -1) + 1,
          },
        });
        cards.push(c);
      }
      return cards;
    });

    return NextResponse.json({
      copiedTo: createdCards.length,
      cards: createdCards,
    });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[POST /api/breakout/assignments/[id]/copy-card]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
