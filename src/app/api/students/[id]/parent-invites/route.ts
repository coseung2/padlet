import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateCode } from "@/lib/parent-codes";

// POST /api/students/[id]/parent-invites
// Teacher-only: issue a new parent invite code for the given student.
// A teacher is authorised iff they own (Classroom.teacherId) the classroom the
// student belongs to. Editors on boards that include the classroom are NOT
// granted parent-invite issuance — that is a role reserved for the classroom
// teacher.
//
// Response: { id, code, codeDisplay, qrPngDataUrl, expiresAt, maxUses, joinUrl }

const PARENT_JOIN_PATH = "/parent/join";
const INVITE_TTL_MS = 48 * 60 * 60 * 1000; // 48h

function joinUrl(origin: string, code: string) {
  const u = new URL(PARENT_JOIN_PATH, origin);
  u.searchParams.set("code", code);
  return u.toString();
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: studentId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { classroom: { select: { teacherId: true } } },
  });
  if (!student) {
    return NextResponse.json({ error: "student_not_found" }, { status: 404 });
  }
  if (student.classroom.teacherId !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Reject issuance if there's already an active code with uses remaining and
  // not yet expired. Teacher must revoke or wait for expiry first. This
  // prevents accidental code-spam.
  const now = new Date();
  const existing = await db.parentInviteCode.findFirst({
    where: {
      studentId,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing && existing.usesCount < existing.maxUses && existing.failedAttempts < 10) {
    // Return the existing code rather than minting a duplicate; teacher flow
    // relies on the invite modal reading the most-recent active code.
    const qrPngDataUrl = await QRCode.toDataURL(joinUrl(new URL(req.url).origin, existing.code), {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
    });
    return NextResponse.json({
      id: existing.id,
      code: existing.code,
      qrPngDataUrl,
      expiresAt: existing.expiresAt.toISOString(),
      maxUses: existing.maxUses,
      usesCount: existing.usesCount,
      joinUrl: joinUrl(new URL(req.url).origin, existing.code),
      reused: true,
    });
  }

  // Fresh code. Retry loop handles the (astronomically unlikely) code collision.
  let row: Awaited<ReturnType<typeof db.parentInviteCode.create>> | null = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { code, codeHash } = generateCode();
    try {
      row = await db.parentInviteCode.create({
        data: {
          studentId,
          issuedByUserId: user.id,
          code,
          codeHash,
          expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
          maxUses: 3,
        },
      });
      break;
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === "P2002") continue; // collision — retry
      throw e;
    }
  }
  if (!row) {
    return NextResponse.json({ error: "code_generation_failed" }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  const qrPngDataUrl = await QRCode.toDataURL(joinUrl(origin, row.code), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
  });

  return NextResponse.json({
    id: row.id,
    code: row.code,
    qrPngDataUrl,
    expiresAt: row.expiresAt.toISOString(),
    maxUses: row.maxUses,
    usesCount: 0,
    joinUrl: joinUrl(origin, row.code),
    reused: false,
  });
}

// GET — list active invites for a student (teacher only).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: studentId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { classroom: { select: { teacherId: true } } },
  });
  if (!student) return NextResponse.json({ error: "student_not_found" }, { status: 404 });
  if (student.classroom.teacherId !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const invites = await db.parentInviteCode.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    invites: invites.map((i) => ({
      id: i.id,
      code: i.code,
      maxUses: i.maxUses,
      usesCount: i.usesCount,
      failedAttempts: i.failedAttempts,
      expiresAt: i.expiresAt.toISOString(),
      revokedAt: i.revokedAt?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
      active:
        !i.revokedAt && i.expiresAt > new Date() && i.usesCount < i.maxUses && i.failedAttempts < 10,
    })),
  });
}
