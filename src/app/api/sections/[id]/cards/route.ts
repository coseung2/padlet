import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentStudent } from "@/lib/student-auth";
import { viewSection, ForbiddenError, assertBreakoutVisibility } from "@/lib/rbac";

/**
 * GET /api/sections/:id/cards?token=<accessToken>
 *
 * Breakout (T0-①) section-scoped card fetch. Returns ONLY cards belonging
 * to the given sectionId. Never exposes other-section cards, even when the
 * caller is an authenticated board member.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sectionId } = await params;
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    const [user, student] = await Promise.all([
      getCurrentUser().catch(() => null),
      getCurrentStudent(),
    ]);

    const section = await viewSection(sectionId, {
      userId: user?.id ?? null,
      studentClassroomId: student?.classroomId ?? null,
      token,
    });

    // BR-6 layered gate: if section belongs to a breakout board, apply the
    // visibility mode. Teachers + share-token callers short-circuit inside.
    await assertBreakoutVisibility({
      sectionId,
      boardId: section.boardId,
      userId: user?.id ?? null,
      studentId: student?.id ?? null,
      token,
    });

    const cards = await db.card.findMany({
      where: { sectionId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ cards });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    console.error("[GET /api/sections/:id/cards]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
