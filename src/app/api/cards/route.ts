import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentStudent } from "@/lib/student-auth";
import { requirePermission, ForbiddenError } from "@/lib/rbac";
import { isCanvaDesignUrl, resolveCanvaEmbedUrl, expandCanvaShortLink } from "@/lib/canva";
import { extractVideoId, fetchYouTubeMeta, canonicalUrl } from "@/lib/youtube";
import { setCardAuthors } from "@/lib/card-authors-service";
import { isAllowedFileUrl, isAllowedStoredMime } from "@/lib/file-attachment";

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
  // card-file-attachment: 일반 파일 첨부 (PDF/DOCX/XLSX/PPTX/HWP/TXT/ZIP)
  fileUrl: z.string().url().nullable().optional(),
  fileName: z.string().max(255).nullable().optional(),
  fileSize: z.number().int().nonnegative().nullable().optional(),
  fileMimeType: z.string().max(100).nullable().optional(),
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().optional(),
  height: z.number().optional(),
  order: z.number().optional(),
  sectionId: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = CreateCardSchema.parse(body);

    // card-file-attachment — 파일 필드 출처/MIME 화이트리스트 검증.
    // CreateCardSchema는 형식(url·길이)만 검증하므로, 호스트·허용 MIME은
    // 여기서 추가로 강제 (codex 리뷰 반영: /api/upload 우회 stored-XSS 차단).
    if (input.fileUrl !== undefined && !isAllowedFileUrl(input.fileUrl)) {
      return NextResponse.json(
        { error: "fileUrl must be from the project upload storage" },
        { status: 400 }
      );
    }
    if (!isAllowedStoredMime(input.fileMimeType ?? null)) {
      return NextResponse.json(
        { error: "fileMimeType is not in the document whitelist" },
        { status: 400 }
      );
    }
    // 4개 필드 일관성: fileUrl이 있으면 나머지 3개도 반드시 동반 (누락된
    // 렌더 경로는 UI가 깨짐). 없으면 4개 모두 null로 강제.
    if (input.fileUrl) {
      if (!input.fileName || !input.fileMimeType || !input.fileSize) {
        return NextResponse.json(
          { error: "fileUrl requires fileName, fileSize, fileMimeType" },
          { status: 400 }
        );
      }
    }

    // Auth precedence: teacher (NextAuth) → student (HMAC cookie). Same
    // order as resolveIdentity / PATCH / DELETE. A leftover student_session
    // cookie from prior testing must NOT hijack a teacher-initiated POST.
    let teacherUser: Awaited<ReturnType<typeof getCurrentUser>> | null = null;
    try {
      teacherUser = await getCurrentUser();
    } catch {
      teacherUser = null;
    }

    let authorId: string;
    let studentAuthorId: string | null = null;
    let externalAuthorName: string | null = null;
    let currentUserName: string | null = null;
    let student: Awaited<ReturnType<typeof getCurrentStudent>> = null;

    if (teacherUser) {
      await requirePermission(input.boardId, teacherUser.id, "edit");
      authorId = teacherUser.id;
      currentUserName = teacherUser.name;
    } else {
      student = await getCurrentStudent();
      if (!student) {
        return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
      }
      const board = await db.board.findUnique({
        where: { id: input.boardId },
        select: {
          classroomId: true,
          classroom: { select: { teacherId: true } },
        },
      });
      if (!board || !board.classroom) {
        return NextResponse.json({ error: "board_not_accessible" }, { status: 403 });
      }
      if (board.classroomId !== student.classroomId) {
        return NextResponse.json({ error: "classroom_mismatch" }, { status: 403 });
      }
      authorId = board.classroom.teacherId;
      studentAuthorId = student.id;
      externalAuthorName = student.name;
      currentUserName = student.name;
    }

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
    let videoUrl = input.videoUrl ?? null;
    if (linkUrl && isCanvaDesignUrl(linkUrl)) {
      // Canva's "링크 공유" button hands out canva.link short URLs —
      // expand to the canonical canva.com/{id}/{shareToken}/view form
      // before storing so the client-side hasCanvaShareToken gate works.
      linkUrl = await expandCanvaShortLink(linkUrl);
      const embed = await resolveCanvaEmbedUrl(linkUrl);
      if (embed) {
        // oEmbed resolver strips the share token from its response, so
        // we only overwrite derived fields and leave linkUrl (already
        // expanded above) untouched.
        linkImage = embed.thumbnailUrl;
        if (input.linkTitle === undefined) linkTitle = embed.title;
        if (input.linkDesc === undefined) {
          linkDesc = embed.authorName ? `by ${embed.authorName}` : null;
        }
      } else {
        // oEmbed failed (anonymous 401 is the common path). The iframe
        // can still render when the URL carries a share token — the
        // client's canRenderCanvaEmbed gate opens in that case. We
        // just don't have a thumbnail.
        linkImage = null;
      }
    } else if (linkUrl) {
      // YouTube oEmbed enrichment. Matches the DJ queue submit handler so
      // columns/freeform/grid/stream cards with a YouTube URL get the same
      // thumbnail + title + channel auto-fill instead of a bare link.
      const videoId = extractVideoId(linkUrl);
      if (videoId) {
        const meta = await fetchYouTubeMeta(videoId);
        if (meta) {
          linkUrl = meta.canonicalUrl;
          linkImage = meta.thumbnailUrl;
          if (input.linkTitle === undefined) linkTitle = meta.title;
          if (input.linkDesc === undefined) {
            linkDesc = meta.authorName || null;
          }
          // Populate videoUrl so DJ-style inline embed renders work when
          // a card UI chooses to show a player (opt-in per layout).
          if (!videoUrl) videoUrl = meta.canonicalUrl;
        } else if (!linkTitle && input.linkTitle === undefined) {
          // oEmbed failed (private / deleted / rate-limited). Keep raw URL,
          // no preview. Matches pre-enrichment behaviour.
          linkUrl = canonicalUrl(videoId);
        }
      }
    }

    const card = await db.$transaction(async (tx) => {
      const c = await tx.card.create({
        data: {
          boardId: input.boardId,
          authorId,
          studentAuthorId,
          externalAuthorName,
          title: input.title,
          content: input.content,
          color: input.color ?? null,
          imageUrl: input.imageUrl ?? null,
          linkUrl,
          linkTitle,
          linkDesc,
          linkImage,
          videoUrl,
          fileUrl: input.fileUrl ?? null,
          fileName: input.fileName ?? null,
          fileSize: input.fileSize ?? null,
          fileMimeType: input.fileMimeType ?? null,
          x: input.x,
          y: input.y,
          width: input.width ?? 240,
          height: input.height ?? 160,
          order: input.order ?? 0,
          sectionId: input.sectionId ?? null,
        },
      });
      // Student-authored cards get a primary CardAuthor row so the
      // source of truth for authorship lives in the join table from the
      // start. Teacher-created cards (no studentAuthorId) get no initial
      // CardAuthor rows — teacher can open the editor to attribute.
      if (studentAuthorId && externalAuthorName) {
        await setCardAuthors(tx, c.id, [
          { studentId: studentAuthorId, displayName: externalAuthorName },
        ]);
      }
      return c;
    });

    // Mirror the server-side cardProps mapping (board/[id]/page.tsx) so
    // the client can drop the response straight into state and keep the
    // CardAuthorFooter populated without a page reload.
    return NextResponse.json({
      card: {
        ...card,
        createdAt: card.createdAt.toISOString(),
        authorName: currentUserName,
        studentAuthorName: student?.name ?? null,
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
