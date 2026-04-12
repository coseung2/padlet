import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentTier, canUseTemplate } from "@/lib/tier";
import {
  BreakoutConfigSchema,
  cloneStructure,
  groupSectionTitle,
} from "@/lib/breakout";

const CreateBoardSchema = z.object({
  title: z.string().max(200).default(""),
  layout: z.enum([
    "freeform",
    "grid",
    "stream",
    "columns",
    "assignment",
    "quiz",
    "drawing",
    "breakout",
  ]),
  description: z.string().max(2000).default(""),
  classroomId: z.string().optional(),
  // BR-3: Breakout-specific config (only used when layout === "breakout").
  breakoutConfig: BreakoutConfigSchema.optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const input = CreateBoardSchema.parse(body);

    const baseSlug = input.title
      ? input.title.toLowerCase().replace(/[^a-z0-9가-힣]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
      : "board";
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // ── Breakout branch (BR-3) ──────────────────────────────────────────
    if (input.layout === "breakout") {
      if (!input.breakoutConfig) {
        return NextResponse.json(
          { error: "breakoutConfig required for layout=breakout" },
          { status: 400 }
        );
      }
      const cfg = input.breakoutConfig;
      const template = await db.breakoutTemplate.findUnique({
        where: { id: cfg.templateId },
      });
      if (!template) {
        return NextResponse.json({ error: "template_not_found" }, { status: 404 });
      }

      // Tier gating — foundation stub.
      const tier = getCurrentTier(user.id);
      if (!canUseTemplate(tier, template.requiresPro)) {
        return NextResponse.json(
          { error: "pro_required", templateKey: template.key },
          { status: 403 }
        );
      }

      // Deep-clone structure so template edits never retroactively affect this
      // board (decisions Q6 — 복사 원칙).
      const structure = cloneStructure(template.structure);

      const effectiveTitle = input.title || template.name;
      const groupCount = cfg.groupCount;

      // Single transaction: Board + Assignment + Sections + default Cards.
      const board = await db.$transaction(async (tx) => {
        const createdBoard = await tx.board.create({
          data: {
            title: effectiveTitle,
            slug,
            layout: "breakout",
            description: input.description,
            classroomId: input.classroomId ?? null,
            members: {
              create: { userId: user.id, role: "owner" },
            },
          },
        });

        const assignment = await tx.breakoutAssignment.create({
          data: {
            boardId: createdBoard.id,
            templateId: template.id,
            deployMode: cfg.deployMode ?? "link-fixed",
            groupCount,
            groupCapacity: cfg.groupCapacity,
            visibilityOverride: cfg.visibilityOverride ?? null,
            status: "active",
          },
        });

        // Group sections: for each group 1..N, for each sectionsPerGroup spec,
        // create a Section. Default cards are inserted inside the spec loop.
        let orderCursor = 0;
        for (let g = 1; g <= groupCount; g++) {
          for (const spec of structure.sectionsPerGroup) {
            const section = await tx.section.create({
              data: {
                boardId: createdBoard.id,
                title: groupSectionTitle(g, spec.title),
                order: orderCursor++,
              },
            });
            if (spec.defaultCards && spec.defaultCards.length > 0) {
              let cardOrder = 0;
              for (const card of spec.defaultCards) {
                await tx.card.create({
                  data: {
                    boardId: createdBoard.id,
                    sectionId: section.id,
                    authorId: user.id,
                    title: card.title,
                    content: card.content,
                    x: 0,
                    y: 0,
                    order: cardOrder++,
                  },
                });
              }
            }
          }
        }

        // Shared teacher-pool section — board-level single.
        if (structure.sharedSections) {
          for (const shared of structure.sharedSections) {
            await tx.section.create({
              data: {
                boardId: createdBoard.id,
                title: shared.title,
                order: orderCursor++,
              },
            });
          }
        }

        return { ...createdBoard, assignmentId: assignment.id };
      });

      return NextResponse.json({ board });
    }

    // ── Non-breakout layouts (unchanged) ────────────────────────────────
    // If columns layout with classroom, fetch students for auto-sections
    let students: { number: number | null; name: string }[] = [];
    if (input.layout === "columns" && input.classroomId) {
      const classroom = await db.classroom.findUnique({
        where: { id: input.classroomId },
        include: {
          students: { orderBy: [{ number: "asc" }, { createdAt: "asc" }] },
        },
      });
      if (classroom && classroom.teacherId === user.id) {
        students = classroom.students.map((s) => ({
          number: s.number,
          name: s.name,
        }));
      }
    }

    const board = await db.board.create({
      data: {
        title: input.title,
        slug,
        layout: input.layout,
        description: input.description,
        classroomId: input.classroomId ?? null,
        members: {
          create: { userId: user.id, role: "owner" },
        },
        sections:
          students.length > 0
            ? {
                create: students.map((s, i) => ({
                  title: s.number ? `${s.number}번 ${s.name}` : s.name,
                  order: i,
                })),
              }
            : undefined,
      },
    });

    return NextResponse.json({ board });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[POST /api/boards]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
