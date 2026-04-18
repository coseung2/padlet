import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentStudent } from "@/lib/student-auth";
import { getCurrentUser } from "@/lib/auth";
import { getBoardRole } from "@/lib/rbac";

// Attach a StudentAsset to a Card (and optionally a PlantObservation).
// Caller must be the asset owner (student session) OR an owner of the target
// board. When cardId is provided, Card.imageUrl is populated (only if empty,
// to avoid clobbering an existing attachment chosen via /api/upload).

const BodySchema = z
  .object({
    cardId: z.string().optional(),
    observationId: z.string().optional(),
  })
  .refine((v) => v.cardId || v.observationId, {
    message: "cardId or observationId required",
  });

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const input = BodySchema.parse(body);

    const asset = await db.studentAsset.findUnique({ where: { id } });
    if (!asset) return NextResponse.json({ error: "not found" }, { status: 404 });

    const [student, user] = await Promise.all([
      getCurrentStudent(),
      getCurrentUser().catch(() => null),
    ]);

    let authorized = false;
    if (student && student.id === asset.studentId) authorized = true;

    if (!authorized && input.cardId && user) {
      const card = await db.card.findUnique({ where: { id: input.cardId } });
      if (card) {
        const role = await getBoardRole(card.boardId, user.id);
        if (role === "owner") authorized = true;
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const attachment = await db.assetAttachment.create({
      data: {
        assetId: asset.id,
        cardId: input.cardId ?? null,
        observationId: input.observationId ?? null,
      },
    });

    if (input.cardId) {
      const card = await db.card.findUnique({ where: { id: input.cardId } });
      if (card && !card.imageUrl) {
        await db.card.update({
          where: { id: card.id },
          data: { imageUrl: asset.thumbnailUrl ?? asset.fileUrl },
        });
      }
    }

    return NextResponse.json({
      attachment: {
        id: attachment.id,
        assetId: attachment.assetId,
        cardId: attachment.cardId,
        observationId: attachment.observationId,
        createdAt: attachment.createdAt.toISOString(),
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[POST /api/student-assets/[id]/attach]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
