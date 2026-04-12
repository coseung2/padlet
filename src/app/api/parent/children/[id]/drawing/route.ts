import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withParentScopeForStudent } from "@/lib/parent-scope";

// PV-7 Drawing library — parent read-only view of StudentAsset.
//
// Filter: `studentId === params.id`. `isSharedToClass` is ignored — a parent
// always gets to see their own child's work regardless of the class-share
// toggle (per SSOT §5). We explicitly do NOT join against other students'
// assets on the same classroom.
//
// Thumbnails: we return `thumbnailUrl` when present. Renderer uses
// OptimizedImage which clamps fetch size under the 200KB budget.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await ctx.params;
  return withParentScopeForStudent(req, studentId, async () => {
    const assets = await db.studentAsset.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        thumbnailUrl: true,
        width: true,
        height: true,
        format: true,
        sizeBytes: true,
        isSharedToClass: true,
        source: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ assets });
  });
}
