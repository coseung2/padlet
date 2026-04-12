/**
 * GET /api/species — all plant species with stages.
 * Readable by any authenticated user or active student session.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth-config";
import { getCurrentStudent } from "@/lib/student-auth";
import { parseObservationPoints } from "@/lib/plant-schemas";

export async function GET() {
  try {
    const session = await auth();
    const student = await getCurrentStudent();
    if (!session?.user?.id && !student) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const species = await db.plantSpecies.findMany({
      include: { stages: { orderBy: { order: "asc" } } },
      orderBy: { key: "asc" },
    });
    return NextResponse.json({
      species: species.map((s) => ({
        id: s.id,
        key: s.key,
        nameKo: s.nameKo,
        emoji: s.emoji,
        difficulty: s.difficulty,
        season: s.season,
        notes: s.notes,
        stages: s.stages.map((st) => ({
          id: st.id,
          order: st.order,
          key: st.key,
          nameKo: st.nameKo,
          description: st.description,
          icon: st.icon,
          observationPoints: parseObservationPoints(st.observationPoints),
        })),
      })),
    });
  } catch (e) {
    console.error("[GET /api/species]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
