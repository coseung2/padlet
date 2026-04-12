import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission, getBoardRole, ForbiddenError } from "@/lib/rbac";
import { isCanvaDesignUrl, resolveCanvaEmbedUrl } from "@/lib/canva";

const PatchCardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(5000).optional(),
  color: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  linkUrl: z.string().url().nullable().optional(),
  linkTitle: z.string().nullable().optional(),
  linkDesc: z.string().nullable().optional(),
  linkImage: z.string().nullable().optional(),
  videoUrl: z.string().url().nullable().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  order: z.number().int().optional(),
  sectionId: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const card = await db.card.findUnique({ where: { id } });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    await requirePermission(card.boardId, user.id, "edit");

    const body = await req.json();
    const input = PatchCardSchema.parse(body);

    // URL-change guard: re-resolve Canva oEmbed only when linkUrl actually
    // changes. Drag / resize PATCHes skip the outbound fetch.
    //
    // Server owns linkImage for Canva URLs (iframe-gate invariant).
    // linkTitle / linkDesc respect an explicit client value when provided
    // (so `{ linkTitle: null }` blanks the title), and are filled from
    // oEmbed only when `undefined`.
    const patch: typeof input = { ...input };

    const urlChanged =
      typeof patch.linkUrl === "string" && patch.linkUrl !== card.linkUrl;

    // Resulting linkUrl after this PATCH (client value if sent, otherwise
    // the stored one). This drives whether the card still counts as a
    // Canva card for the server-owned-linkImage invariant.
    const effectiveLinkUrl: string | null =
      typeof patch.linkUrl === "string"
        ? patch.linkUrl
        : patch.linkUrl === null
          ? null
          : card.linkUrl;

    const effectiveIsCanva = Boolean(
      effectiveLinkUrl && isCanvaDesignUrl(effectiveLinkUrl)
    );

    if (urlChanged && isCanvaDesignUrl(patch.linkUrl as string)) {
      const embed = await resolveCanvaEmbedUrl(patch.linkUrl as string);
      if (embed) {
        patch.linkUrl = `https://www.canva.com/design/${embed.designId}/view`;
        patch.linkImage = embed.thumbnailUrl;
        if (patch.linkTitle === undefined) patch.linkTitle = embed.title;
        if (patch.linkDesc === undefined) {
          patch.linkDesc = embed.authorName ? `by ${embed.authorName}` : null;
        }
      } else {
        patch.linkImage = null;
      }
    } else if (effectiveIsCanva && patch.linkImage !== undefined) {
      // linkUrl unchanged (still Canva) — client cannot seed linkImage
      // because it gates the iframe render. Drop the field so the stored
      // server-owned value stays in place.
      delete patch.linkImage;
    }

    const updated = await db.card.update({ where: { id }, data: patch });

    return NextResponse.json({ card: updated });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[PATCH /api/cards/:id]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const card = await db.card.findUnique({ where: { id } });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const role = await getBoardRole(card.boardId, user.id);
    if (!role) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    // owner deletes anything; editor deletes own cards only
    const isAuthor = card.authorId === user.id;
    const canDelete = role === "owner" || (role === "editor" && isAuthor);
    if (!canDelete) {
      return NextResponse.json(
        { error: `Role "${role}" cannot delete this card` },
        { status: 403 }
      );
    }

    await db.card.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("[DELETE /api/cards/:id]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
