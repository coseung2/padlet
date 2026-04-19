import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  PERMISSION_CATALOG,
  ALL_PERMISSION_KEYS,
} from "@/lib/bank-permissions";

// GET /api/classrooms/:id/role-permissions
// Returns: current effective permission state per role, teacher-only.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classroomId } = await params;

  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const classroom = await db.classroom.findUnique({
    where: { id: classroomId },
    select: { teacherId: true },
  });
  if (!classroom) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (classroom.teacherId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Load role defs + assignments (to show who has each role)
  const [defs, assignments, overrides] = await Promise.all([
    db.classroomRoleDef.findMany({
      orderBy: { createdAt: "asc" },
    }),
    db.classroomRoleAssignment.findMany({
      where: { classroomId },
      include: { student: { select: { id: true, name: true, number: true } } },
    }),
    db.classroomRolePermission.findMany({
      where: { classroomId },
    }),
  ]);

  // Build role → permission state map
  const catalog = Object.entries(PERMISSION_CATALOG).map(([key, info]) => ({
    key,
    ...info,
  }));

  const rolePerms: Record<string, Record<string, boolean>> = {};
  for (const def of defs) {
    const roleKey = def.key;
    rolePerms[roleKey] = {};
    for (const pk of ALL_PERMISSION_KEYS) {
      // Check override first
      const override = overrides.find(
        (o) => o.roleKey === roleKey && o.permission === pk
      );
      if (override) {
        rolePerms[roleKey][pk] = override.granted;
        continue;
      }
      // If any override row exists for this permission in any role, don't use defaults
      const anyOverride = overrides.some((o) => o.permission === pk);
      if (anyOverride) {
        rolePerms[roleKey][pk] = false;
      } else {
        rolePerms[roleKey][pk] = PERMISSION_CATALOG[
          pk as keyof typeof PERMISSION_CATALOG
        ].defaultRoles.includes(roleKey as never);
      }
    }
  }

  // Assignments grouped by role key
  const assignedByRole: Record<
    string,
    { id: string; name: string; number: number | null }[]
  > = {};
  for (const a of assignments) {
    const def = defs.find((d) => d.id === a.classroomRoleId);
    if (!def) continue;
    (assignedByRole[def.key] ??= []).push(a.student);
  }

  return NextResponse.json({
    catalog,
    roles: defs.map((d) => ({
      key: d.key,
      labelKo: d.labelKo,
      emoji: d.emoji,
      description: d.description,
      assignedStudents: assignedByRole[d.key] ?? [],
      permissions: rolePerms[d.key] ?? {},
    })),
  });
}
