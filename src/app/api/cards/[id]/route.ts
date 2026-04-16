import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ForbiddenError } from "@/lib/rbac";
import { resolveIdentities } from "@/lib/identity";
import { canEditCard, canDeleteCard, type BoardLike, type CardLike } from "@/lib/card-permissions";
import { isCanvaDesignUrl, resolveCanvaEmbedUrl, expandCanvaShortLink } from "@/lib/canva";

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

    const card = await db.card.findUnique({ where: { id } });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const board = await db.board.findUnique({
      where: { id: card.boardId },
      select: {
        id: true,
        classroomId: true,
        classroom: { select: { teacherId: true } },
      },
    });
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const identity = await resolveIdentities();
    const boardLike: BoardLike = {
      id: board.id,
      classroomId: board.classroomId,
      ownerUserId: board.classroom?.teacherId ?? null,
    };
    const cardLike: CardLike = {
      id: card.id,
      boardId: card.boardId,
      authorId: card.authorId,
      studentAuthorId: card.studentAuthorId,
    };
    if (!canEditCard(identity, boardLike, cardLike)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
      // Expand canva.link short-URL so the stored value carries the
      // share-token path segment that client predicates need.
      patch.linkUrl = await expandCanvaShortLink(patch.linkUrl as string);
      const embed = await resolveCanvaEmbedUrl(patch.linkUrl);
      if (embed) {
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

    const card = await db.card.findUnique({ where: { id } });
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const board = await db.board.findUnique({
      where: { id: card.boardId },
      select: {
        id: true,
        classroomId: true,
        classroom: { select: { teacherId: true } },
      },
    });
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const identity = await resolveIdentities();
    const boardLike: BoardLike = {
      id: board.id,
      classroomId: board.classroomId,
      ownerUserId: board.classroom?.teacherId ?? null,
    };
    const cardLike: CardLike = {
      id: card.id,
      boardId: card.boardId,
      authorId: card.authorId,
      studentAuthorId: card.studentAuthorId,
    };
    if (!canDeleteCard(identity, boardLike, cardLike)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
