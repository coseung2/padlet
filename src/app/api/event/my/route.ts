/**
 * GET    /api/event/my?boardId=...&submitToken=...
 * PATCH  /api/event/my   { submitToken, ...payload }
 *
 * PUBLIC endpoints. The submitToken is the only credential — compared
 * timing-safe against Submission.submitToken. Cookie `as_submit_<boardId>` is
 * used as fallback when query param is absent.
 *
 * PATCH is allowed only before applicationEnd and when status ∈ {pending_approval, submitted}.
 * It re-validates payload via submitPayloadSchema and applies the same video rules as /submit.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { updateMyPayloadSchema, parseCustomQuestions } from "@/lib/event/schemas";
import { tokensEqual } from "@/lib/event/tokens";
import { extractYoutubeId, youtubeThumbnailUrl } from "@/lib/event/youtube";

async function resolveSubmitToken(boardId: string, urlToken: string | null): Promise<string | null> {
  if (urlToken) return urlToken;
  const store = await cookies();
  return store.get(`as_submit_${boardId}`)?.value ?? null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const boardId = url.searchParams.get("boardId");
  const rawToken = url.searchParams.get("submitToken");
  if (!boardId) return NextResponse.json({ error: "boardId_required" }, { status: 400 });
  const token = await resolveSubmitToken(boardId, rawToken);
  if (!token) return NextResponse.json({ error: "no_token" }, { status: 401 });

  const submission = await db.submission.findUnique({
    where: { submitToken: token },
  });
  if (!submission || submission.boardId !== boardId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  // Timing-safe re-check (findUnique on indexed unique is acceptable for lookup,
  // but we still want constant-time semantic compare for defense-in-depth.)
  if (!tokensEqual(token, submission.submitToken)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    submission: {
      id: submission.id,
      status: submission.status,
      applicantName: submission.applicantName,
      applicantGrade: submission.applicantGrade,
      applicantClass: submission.applicantClass,
      applicantNumber: submission.applicantNumber,
      applicantContact: submission.applicantContact,
      teamName: submission.teamName,
      teamMembers: JSON.parse(submission.teamMembers || "[]"),
      answers: JSON.parse(submission.answers || "{}"),
      videoUrl: submission.videoUrl,
      videoProvider: submission.videoProvider,
      videoId: submission.videoId,
      videoThumbnail: submission.videoThumbnail,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
    },
  });
}

export async function PATCH(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = updateMyPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload", detail: parsed.error.issues }, { status: 400 });
  }
  const p = parsed.data;

  const submission = await db.submission.findUnique({
    where: { submitToken: p.submitToken },
  });
  if (!submission || submission.boardId !== p.boardId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!tokensEqual(p.submitToken, submission.submitToken)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const board = await db.board.findUnique({ where: { id: submission.boardId } });
  if (!board) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const now = new Date();
  if (board.applicationEnd && now > board.applicationEnd) {
    return NextResponse.json({ error: "application_closed" }, { status: 400 });
  }
  if (!(submission.status === "pending_approval" || submission.status === "submitted")) {
    return NextResponse.json({ error: "not_editable" }, { status: 400 });
  }

  const questions = parseCustomQuestions(board.customQuestions);
  const answers = p.answers ?? JSON.parse(submission.answers || "{}");
  for (const q of questions) {
    if (q.required) {
      const v = (answers as Record<string, unknown>)[q.id];
      const empty =
        v == null ||
        (typeof v === "string" && v.trim() === "") ||
        (Array.isArray(v) && v.length === 0);
      if (empty) return NextResponse.json({ error: "missing_required", field: q.id }, { status: 400 });
    }
  }

  let videoUrl = p.videoUrl ?? submission.videoUrl;
  let videoProvider = p.videoProvider ?? submission.videoProvider;
  let videoId = p.videoId ?? submission.videoId;
  let videoThumbnail = submission.videoThumbnail;
  if (p.videoUrl !== undefined) {
    if (p.videoUrl) {
      const yt = extractYoutubeId(p.videoUrl);
      if (yt && (!videoProvider || videoProvider === "youtube")) {
        videoProvider = "youtube";
        videoId = yt;
        videoThumbnail = youtubeThumbnailUrl(yt);
      } else if (!yt && (!videoProvider || videoProvider === "youtube")) {
        return NextResponse.json({ error: "invalid_youtube_url" }, { status: 400 });
      }
    } else {
      // clear video
      videoUrl = null;
      videoProvider = null;
      videoId = null;
      videoThumbnail = null;
    }
  }

  await db.submission.update({
    where: { id: submission.id },
    data: {
      applicantName: p.applicantName ?? submission.applicantName,
      applicantGrade: p.applicantGrade ?? submission.applicantGrade,
      applicantClass: p.applicantClass ?? submission.applicantClass,
      applicantNumber: p.applicantNumber ?? submission.applicantNumber,
      applicantContact: p.applicantContact ?? submission.applicantContact,
      teamName: p.teamName ?? submission.teamName,
      teamMembers: p.teamMembers !== undefined ? JSON.stringify(p.teamMembers) : submission.teamMembers,
      answers: JSON.stringify(answers),
      videoUrl,
      videoProvider,
      videoId,
      videoThumbnail,
    },
  });
  return NextResponse.json({ ok: true });
}
