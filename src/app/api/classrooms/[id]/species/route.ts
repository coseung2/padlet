/**
 * GET  /api/classrooms/[id]/species  — allowed species for this classroom.
 *   - Teacher (owner of classroom) may read.
 *   - Students in the same classroom may read.
 * PUT  /api/classrooms/[id]/species  — replace allow-list.
 *   - Teacher only. body: { speciesIds: string[] }
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentStudent } from "@/lib/student-auth";
import { AllowListSchema, parseObservationPoints } from "@/lib/plant-schemas";

async function resolveClassroomAccess(classroomId: string) {
  const [user, student, classroom] = await Promise.all([
    getCurrentUser().catch(() => null),
    getCurrentStudent(),
    db.classroom.findUnique({ where: { id: classroomId } }),
  ]);
  if (!classroom) return { status: 404 as const };
  const isTeacher = !!user?.id && classroom.teacherId === user.id;
  const isStudent = !!student && student.classroomId === classroomId;
  if (!isTeacher && !isStudent) return { status: 403 as const };
  return { status: 200 as const, classroom, isTeacher };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await resolveClassroomAccess(id);
    if (access.status !== 200) {
      return NextResponse.json(
        { error: access.status === 404 ? "not found" : "forbidden" },
        { status: access.status }
      );
    }
    const allows = await db.classroomPlantAllow.findMany({
      where: { classroomId: id },
      include: { species: { include: { stages: { orderBy: { order: "asc" } } } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({
      species: allows.map((a) => ({
        id: a.species.id,
        key: a.species.key,
        nameKo: a.species.nameKo,
        emoji: a.species.emoji,
        difficulty: a.species.difficulty,
        season: a.species.season,
        notes: a.species.notes,
        stages: a.species.stages.map((st) => ({
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
    console.error("[GET /api/classrooms/:id/species]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser().catch(() => null);
    if (!user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const classroom = await db.classroom.findUnique({ where: { id } });
    if (!classroom) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (classroom.teacherId !== user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const input = AllowListSchema.parse(body);

    // Validate speciesIds exist
    const speciesCount = await db.plantSpecies.count({ where: { id: { in: input.speciesIds } } });
    if (speciesCount !== input.speciesIds.length) {
      return NextResponse.json({ error: "unknown species id" }, { status: 400 });
    }

    await db.$transaction([
      db.classroomPlantAllow.deleteMany({ where: { classroomId: id } }),
      ...input.speciesIds.map((speciesId) =>
        db.classroomPlantAllow.create({ data: { classroomId: id, speciesId } })
      ),
    ]);
    return NextResponse.json({ ok: true, count: input.speciesIds.length });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[PUT /api/classrooms/:id/species]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
