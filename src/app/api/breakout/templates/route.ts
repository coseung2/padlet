/**
 * GET /api/breakout/templates
 *
 * Lists system templates (scope="system") + teacher-owned templates for the
 * current user. BR-3 uses this to populate the template picker grid.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser().catch(() => null);

    const templates = await db.breakoutTemplate.findMany({
      where: {
        OR: [
          { scope: "system" },
          ...(user ? [{ scope: "teacher" as const, ownerId: user.id }] : []),
        ],
      },
      orderBy: [{ scope: "asc" }, { requiresPro: "asc" }, { key: "asc" }],
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        tier: true,
        requiresPro: true,
        scope: true,
        recommendedVisibility: true,
        defaultGroupCount: true,
        defaultGroupCapacity: true,
      },
    });

    return NextResponse.json({ templates });
  } catch (e) {
    console.error("[GET /api/breakout/templates]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
