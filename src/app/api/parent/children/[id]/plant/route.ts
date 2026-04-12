import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withParentScopeForStudent } from "@/lib/parent-scope";

// PV-7 Plant journal — parent read-only.
//
// Scope guard first: withParentScopeForStudent enforces that the requesting
// parent has `studentId ∈ parent.children`. If not → 403 (AC-5). If session
// missing/revoked → 401 (AC-7).
//
// Filter: return every StudentPlant whose `studentId === params.id`. Includes
// species stages (for the roadmap rendering) + observations + their images.
// We explicitly do NOT include other students' plants on the same board.
//
// isPrivate? The StudentPlant schema doesn't have an isPrivate flag — parent
// visibility is by-studentId ownership, teacher comments are in the memo
// field of each PlantObservation. No extra masking needed.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await ctx.params;
  const result = await withParentScopeForStudent(req, studentId, async () => {
    const plants = await db.studentPlant.findMany({
      where: { studentId },
      include: {
        species: { include: { stages: { orderBy: { order: "asc" } } } },
        currentStage: true,
        board: { select: { id: true, title: true, slug: true } },
        observations: {
          orderBy: { observedAt: "desc" },
          include: { images: { orderBy: { order: "asc" } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ plants });
  });
  return result;
}
