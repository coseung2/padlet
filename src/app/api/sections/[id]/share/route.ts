import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getBoardRole, ForbiddenError } from "@/lib/rbac";

/**
 * POST /api/sections/:id/share
 *
 * Owner-only. Generates (or rotates) the section's accessToken and returns
 * the share URL. Rotating invalidates previously distributed links because
 * the new token value replaces the old one in the DB.
 */
function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sectionId } = await params;
    const user = await getCurrentUser().catch(() => null);
    if (!user) {
      throw new ForbiddenError("Sign-in required");
    }

    const section = await db.section.findUnique({ where: { id: sectionId } });
    if (!section) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Owner-only: share/rotate is more sensitive than generic "edit".
    const role = await getBoardRole(section.boardId, user.id);
    if (role !== "owner") {
      throw new ForbiddenError("Only the board owner can manage section share links");
    }

    const token = newToken();
    const updated = await db.section.update({
      where: { id: sectionId },
      data: { accessToken: token },
    });

    const shareUrl = `/board/${updated.boardId}/s/${updated.id}?token=${encodeURIComponent(token)}`;

    return NextResponse.json({
      section: {
        id: updated.id,
        title: updated.title,
        accessToken: updated.accessToken,
      },
      shareUrl,
    });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("[POST /api/sections/:id/share]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
