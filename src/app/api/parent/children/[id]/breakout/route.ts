import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withParentScopeForStudent } from "@/lib/parent-scope";

// PV-7 Breakout — parent read-only view of the child's BreakoutMembership
// rows plus the cards in the child's section only.
//
// AC-14 — "Breakout API verifies session.studentId ∈ parent.children before
// returning". withParentScopeForStudent throws 403 on mismatch.
//
// Filter:
//   1) BreakoutMembership WHERE studentId = params.id
//   2) For each membership, pull the owning Section's cards (child's group
//      only). Cards from OTHER sections (peer groups, teacher-pool) are
//      not returned. Jigsaw "expert" + "home" duals stay visible because
//      we key off membership rows — if the child has two memberships
//      (expert + home) both show up.
//   3) Teacher-pool exclusion: teachers don't have BreakoutMembership
//      rows (schema has no teacher pool table), so the filter naturally
//      excludes them.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await ctx.params;
  return withParentScopeForStudent(req, studentId, async () => {
    const memberships = await db.breakoutMembership.findMany({
      where: { studentId },
      orderBy: { joinedAt: "desc" },
      include: {
        assignment: {
          include: {
            board: {
              select: { id: true, title: true, slug: true, classroomId: true },
            },
            template: {
              select: { id: true, name: true, key: true },
            },
          },
        },
        section: {
          select: {
            id: true,
            title: true,
            boardId: true,
            cards: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                content: true,
                imageUrl: true,
                linkUrl: true,
                linkTitle: true,
                createdAt: true,
                attachments: {
                  orderBy: { order: "asc" },
                  where: { kind: "image" },
                  select: { id: true, url: true, order: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ memberships });
  });
}
