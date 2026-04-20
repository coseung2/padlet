import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission, ForbiddenError } from "@/lib/rbac";

const PatchSectionSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  order: z.number().int().optional(),
  // shared-column-sort (2026-04-20): 칼럼별 정렬 모드. 교사만 설정 가능.
  sortMode: z.enum(["manual", "newest", "oldest", "title"]).nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const section = await db.section.findUnique({ where: { id } });
    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    await requirePermission(section.boardId, user.id, "edit");

    const body = await req.json();
    const input = PatchSectionSchema.parse(body);
    const updated = await db.section.update({ where: { id }, data: input });

    return NextResponse.json({ section: updated });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[PATCH /api/sections/:id]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const section = await db.section.findUnique({ where: { id } });
    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    await requirePermission(section.boardId, user.id, "edit");

    // Move cards in this section to unsectioned before deleting
    await db.card.updateMany({
      where: { sectionId: id },
      data: { sectionId: null },
    });

    await db.section.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("[DELETE /api/sections/:id]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
