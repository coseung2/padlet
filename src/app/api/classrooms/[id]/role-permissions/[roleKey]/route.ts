import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ALL_PERMISSION_KEYS, PERMISSION_CATALOG } from "@/lib/bank-permissions";

const Body = z.object({
  permissions: z.record(z.string(), z.boolean()),
});

// PUT /api/classrooms/:id/role-permissions/:roleKey
// Persists the full permission map for a role in this classroom.
// Upserts ClassroomRolePermission rows; keys not in PERMISSION_CATALOG are
// rejected. Teacher-only.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; roleKey: string }> }
) {
  const { id: classroomId, roleKey } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "permissions 필수" },
      { status: 400 }
    );
  }

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

  // Role def must exist
  const roleDef = await db.classroomRoleDef.findUnique({
    where: { key: roleKey },
    select: { id: true },
  });
  if (!roleDef) {
    return NextResponse.json(
      { error: "정의되지 않은 역할" },
      { status: 400 }
    );
  }

  // Filter permissions to catalog keys only
  const entries = Object.entries(parsed.data.permissions).filter(([k]) =>
    (ALL_PERMISSION_KEYS as string[]).includes(k)
  );

  // Upsert each
  await db.$transaction(
    entries.map(([permission, granted]) =>
      db.classroomRolePermission.upsert({
        where: {
          classroomId_roleKey_permission: {
            classroomId,
            roleKey,
            permission,
          },
        },
        create: { classroomId, roleKey, permission, granted },
        update: { granted },
      })
    )
  );

  void PERMISSION_CATALOG;
  return NextResponse.json({ ok: true, count: entries.length });
}
