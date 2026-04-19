import { createHash } from "crypto";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getBoardRole } from "@/lib/rbac";

const POLL_INTERVAL_MS = 3000;
const KEEPALIVE_INTERVAL_MS = 60_000;
const PERMISSION_RECHECK_INTERVAL_MS = 60_000;

// Wire shape mirrors what `/api/boards/:id` and `board/[id]/page.tsx` already
// hand to ColumnsBoard, so the client can drop snapshots straight into state.
type CardWire = {
  id: string;
  title: string;
  content: string;
  color: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkTitle: string | null;
  linkDesc: string | null;
  linkImage: string | null;
  videoUrl: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;
  sectionId: string | null;
  authorId: string | null;
  studentAuthorId: string | null;
  externalAuthorName: string | null;
  studentAuthorName: string | null;
  authorName: string | null;
  authors: Array<{
    id: string;
    studentId: string | null;
    displayName: string;
    order: number;
  }>;
  createdAt: string;
};

type SectionWire = { id: string; title: string; order: number };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: boardIdOrSlug } = await params;

  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const board = await db.board.findFirst({
    where: { OR: [{ id: boardIdOrSlug }, { slug: boardIdOrSlug }] },
    select: { id: true },
  });
  if (!board) {
    return new Response("Not found", { status: 404 });
  }

  const role = await getBoardRole(board.id, user.id);
  if (!role) {
    return new Response("Forbidden", { status: 403 });
  }

  const boardId = board.id;
  const userId = user.id;
  let cancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let lastCardsHash = "";
      let lastSectionsHash = "";
      let lastPermissionCheck = Date.now();
      let lastKeepalive = Date.now();

      function send(event: string, data: unknown) {
        if (cancelled) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          cancelled = true;
        }
      }

      function sendComment(comment: string) {
        if (cancelled) return;
        try {
          controller.enqueue(encoder.encode(`: ${comment}\n\n`));
        } catch {
          cancelled = true;
        }
      }

      async function poll() {
        if (cancelled) return;
        try {
          const now = Date.now();

          if (now - lastPermissionCheck >= PERMISSION_RECHECK_INTERVAL_MS) {
            const r = await getBoardRole(boardId, userId);
            if (!r) {
              send("forbidden", { reason: "permission_revoked" });
              controller.close();
              cancelled = true;
              return;
            }
            lastPermissionCheck = now;
          }

          const [cardsRaw, sectionsRaw] = await Promise.all([
            db.card.findMany({
              where: { boardId },
              orderBy: { order: "asc" },
              include: {
                author: { select: { name: true } },
                studentAuthor: { select: { name: true } },
                authors: {
                  orderBy: { order: "asc" },
                  select: {
                    id: true,
                    studentId: true,
                    displayName: true,
                    order: true,
                  },
                },
              },
            }),
            db.section.findMany({
              where: { boardId },
              orderBy: { order: "asc" },
            }),
          ]);

          const cards: CardWire[] = cardsRaw.map((c) => ({
            id: c.id,
            title: c.title,
            content: c.content,
            color: c.color,
            imageUrl: c.imageUrl,
            linkUrl: c.linkUrl,
            linkTitle: c.linkTitle,
            linkDesc: c.linkDesc,
            linkImage: c.linkImage,
            videoUrl: c.videoUrl,
            x: c.x,
            y: c.y,
            width: c.width,
            height: c.height,
            order: c.order,
            sectionId: c.sectionId,
            authorId: c.authorId,
            studentAuthorId: c.studentAuthorId,
            externalAuthorName: c.externalAuthorName,
            studentAuthorName: c.studentAuthor?.name ?? null,
            authorName: c.author?.name ?? null,
            authors: c.authors.map((a) => ({
              id: a.id,
              studentId: a.studentId,
              displayName: a.displayName,
              order: a.order,
            })),
            createdAt: c.createdAt.toISOString(),
          }));

          const sections: SectionWire[] = sectionsRaw.map((s) => ({
            id: s.id,
            title: s.title,
            order: s.order,
          }));

          const cardsHash = hashStable(cards);
          const sectionsHash = hashStable(sections);

          if (cardsHash !== lastCardsHash || sectionsHash !== lastSectionsHash) {
            lastCardsHash = cardsHash;
            lastSectionsHash = sectionsHash;
            send("snapshot", { cards, sections });
          } else if (now - lastKeepalive >= KEEPALIVE_INTERVAL_MS) {
            sendComment("ping");
            lastKeepalive = now;
          }
        } catch (e) {
          console.error("[SSE board poll]", e);
        }

        if (!cancelled) setTimeout(poll, POLL_INTERVAL_MS);
      }

      poll();
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function hashStable(value: unknown): string {
  return createHash("sha1").update(JSON.stringify(value)).digest("hex");
}
