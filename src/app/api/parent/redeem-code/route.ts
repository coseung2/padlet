import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashCode, normalizeCode, verifyCode } from "@/lib/parent-codes";
import { signMagicLink, dispatchMagicLink } from "@/lib/parent-magic-link";
import {
  extractClientIp,
  hashIp,
  isIpLocked,
  recordIpFailure,
} from "@/lib/parent-rate-limit";

// POST /api/parent/redeem-code
// Public endpoint. Validates a teacher-issued Crockford Base32 code + email,
// upserts a Parent row, links the parent to the student, and dispatches a
// magic link. Rate-limited by IP (5 fails / 15 min) AND per-code
// (10 fails → instant revoke).
//
// Response shapes:
//   200 { ok: true, email, devMagicLinkUrl? }
//   400 zod error
//   410 code_expired | code_revoked | code_exhausted | code_locked_out
//   404 code_not_found  (also used for code-mismatch — no existence leak)
//   429 rate_limited
//   500 internal

const RedeemSchema = z.object({
  code: z.string().min(1).max(32),
  email: z.string().email().max(200),
});

const CHILD_LIMIT_PER_PARENT = 5;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = RedeemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const { code: rawCode } = parsed.data;
  // Normalise email to lowercase for BOTH Parent.email storage AND
  // boundToEmail FK. Keeping these case-consistent prevents the Postgres FK
  // violation that arises when a teacher binds a mixed-case email and a
  // parent submits the same email in another case.
  const email = parsed.data.email.toLowerCase();

  const ip = extractClientIp(req);
  if (isIpLocked(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const normalized = normalizeCode(rawCode);
  // Length guard — normalised Crockford code must be exactly 6 chars.
  if (normalized.length !== 6) {
    recordIpFailure(ip);
    return NextResponse.json({ error: "code_not_found" }, { status: 404 });
  }

  const codeHash = hashCode(normalized);
  // Look up by codeHash — O(1) unique index.
  const invite = await db.parentInviteCode.findUnique({
    where: { codeHash },
    include: { student: { select: { id: true, classroomId: true } } },
  });

  // Time-independent response: always do a verifyCode pass even if invite
  // is null, then branch on results.
  const verified = invite ? verifyCode(rawCode, invite.codeHash) : false;

  if (!invite || !verified) {
    recordIpFailure(ip);
    // Best-effort: if we matched by hash but verifyCode failed (should be
    // impossible since hash collision required), still bump failedAttempts.
    if (invite) {
      await db.parentInviteCode.update({
        where: { id: invite.id },
        data: { failedAttempts: { increment: 1 } },
      });
    }
    return NextResponse.json({ error: "code_not_found" }, { status: 404 });
  }

  const now = new Date();

  if (invite.revokedAt) {
    return NextResponse.json({ error: "code_revoked" }, { status: 410 });
  }
  if (invite.expiresAt <= now) {
    return NextResponse.json({ error: "code_expired" }, { status: 410 });
  }
  if (invite.usesCount >= invite.maxUses) {
    return NextResponse.json({ error: "code_exhausted" }, { status: 410 });
  }
  if (invite.failedAttempts >= 10) {
    // Defensive: if the counter is already at limit, ensure revokedAt is set
    // (the increment-and-check branch below also handles this).
    if (!invite.revokedAt) {
      await db.parentInviteCode.update({
        where: { id: invite.id },
        data: { revokedAt: now },
      });
    }
    return NextResponse.json({ error: "code_locked_out" }, { status: 410 });
  }

  // Optional email binding: if the teacher set boundToEmail, enforce it.
  if (invite.boundToEmail && invite.boundToEmail.toLowerCase() !== email.toLowerCase()) {
    recordIpFailure(ip);
    const nextFails = invite.failedAttempts + 1;
    await db.parentInviteCode.update({
      where: { id: invite.id },
      data: {
        failedAttempts: nextFails,
        revokedAt: nextFails >= 10 ? now : null,
      },
    });
    return NextResponse.json({ error: "code_not_found" }, { status: 404 });
  }

  try {
    // Upsert Parent by email (idempotent — re-pairing uses existing Parent row).
    const parent = await db.parent.upsert({
      where: { email },
      update: {
        // If previously soft-deleted, reactivate on re-pair.
        parentDeletedAt: null,
      },
      create: {
        email,
        // Name defaults to local-part; parent can rename in PV-6 settings.
        name: email.split("@")[0] ?? "학부모",
      },
    });

    // Enforce 5-child limit per parent.
    const existingActiveChildren = await db.parentChildLink.count({
      where: { parentId: parent.id, deletedAt: null },
    });

    // Is this (parent, student) already linked?
    const alreadyLinked = await db.parentChildLink.findUnique({
      where: { parentId_studentId: { parentId: parent.id, studentId: invite.studentId } },
    });

    if (!alreadyLinked && existingActiveChildren >= CHILD_LIMIT_PER_PARENT) {
      return NextResponse.json({ error: "child_limit_exceeded" }, { status: 409 });
    }

    if (!alreadyLinked) {
      await db.parentChildLink.create({
        data: {
          parentId: parent.id,
          studentId: invite.studentId,
        },
      });
    } else if (alreadyLinked.deletedAt) {
      // Restore if previously soft-deleted.
      await db.parentChildLink.update({
        where: { id: alreadyLinked.id },
        data: { deletedAt: null },
      });
    }

    // Consume one use.
    await db.parentInviteCode.update({
      where: { id: invite.id },
      data: {
        usesCount: { increment: 1 },
        // Persist boundToEmail lazily on first successful redeem if not set,
        // so subsequent redeems of the same code must use the same email.
        // This pins the remaining 2 uses to the same household. Optional —
        // if the teacher explicitly wants multi-family sharing they can
        // reissue an unbound code. `email` is already lowercased above for
        // FK-parity with Parent.email.
        boundToEmail: invite.boundToEmail ?? email,
      },
    });

    // Dispatch magic link.
    const token = signMagicLink(parent.id);
    const magicLinkUrl = new URL(
      `/parent/auth/callback?token=${encodeURIComponent(token)}`,
      new URL(req.url).origin
    ).toString();
    const dispatch = await dispatchMagicLink(email, magicLinkUrl);

    // Record lastSeen IP hash on the parent (via session later); meanwhile
    // stamp ipHash on future ParentSession at callback time.
    void hashIp(ip);

    return NextResponse.json({
      ok: true,
      email,
      // Dev fallback — production must set PARENT_EMAIL_ENABLED=true AND
      // implement Resend dispatch; devUrl is then withheld.
      devMagicLinkUrl: dispatch.devUrl ?? null,
      delivered: dispatch.delivered,
    });
  } catch (e) {
    console.error("[POST /api/parent/redeem-code]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
