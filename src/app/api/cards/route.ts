import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { isCanvaDesignUrl, resolveCanvaEmbedUrl } from "@/lib/canva";

const CreateCardSchema = z.object({
  boardId: z.string().min(1),
  title: z.string().min(1).max(200),
  content: z.string().max(5000).default(""),
  color: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  linkUrl: z.string().url().nullable().optional(),
  linkTitle: z.string().nullable().optional(),
  linkDesc: z.string().nullable().optional(),
  linkImage: z.string().nullable().optional(),
  videoUrl: z.string().url().nullable().optional(),
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().optional(),
  height: z.number().optional(),
  order: z.number().optional(),
  sectionId: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const input = CreateCardSchema.parse(body);
    await requirePermission(input.boardId, user.id, "edit");

    // Canva oEmbed enrichment. For a Canva design URL the SERVER owns
    // linkImage completely so the client-side iframe gate
    // (canvaDesignId && linkImage) is a reliable "oEmbed succeeded"
    // signal. linkTitle / linkDesc respect a client-provided value when
    // present (user naming convenience), but a missing / unsendable
    // field is filled from oEmbed.
    //
    // undefined = client did not send the field → fill from oEmbed.
    // explicit null = client sent null on purpose → leave null.
    let linkUrl = input.linkUrl ?? null;
    let linkTitle = input.linkTitle === undefined ? null : input.linkTitle;
    let linkImage = input.linkImage === undefined ? null : input.linkImage;
    let linkDesc = input.linkDesc === undefined ? null : input.linkDesc;
    if (linkUrl && isCanvaDesignUrl(linkUrl)) {
      const embed = await resolveCanvaEmbedUrl(linkUrl);
      if (embed) {
        linkUrl = `https://www.canva.com/design/${embed.designId}/view`;
        // Force-set linkImage from the oEmbed thumbnail so a client
        // cannot satisfy the iframe gate with a stale / unrelated image.
        linkImage = embed.thumbnailUrl;
        if (input.linkTitle === undefined) linkTitle = embed.title;
        if (input.linkDesc === undefined) {
          linkDesc = embed.authorName ? `by ${embed.authorName}` : null;
        }
      } else {
        // oEmbed failed → null linkImage so the client falls back to
        // the plain link-preview rather than attempting a likely-broken
        // iframe.
        linkImage = null;
      }
    }

    const card = await db.card.create({
      data: {
        boardId: input.boardId,
        authorId: user.id,
        title: input.title,
        content: input.content,
        color: input.color ?? null,
        imageUrl: input.imageUrl ?? null,
        linkUrl,
        linkTitle,
        linkDesc,
        linkImage,
        videoUrl: input.videoUrl ?? null,
        x: input.x,
        y: input.y,
        width: input.width ?? 240,
        height: input.height ?? 160,
        order: input.order ?? 0,
        sectionId: input.sectionId ?? null,
      },
    });

    // Mirror the server-side cardProps mapping (board/[id]/page.tsx:209) so
    // the client can drop the response straight into state and keep the
    // CardAuthorFooter populated without a page reload.
    return NextResponse.json({
      card: {
        ...card,
        createdAt: card.createdAt.toISOString(),
        authorName: user.name,
        studentAuthorName: null,
        externalAuthorName: card.externalAuthorName,
      },
    });
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[POST /api/cards]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
