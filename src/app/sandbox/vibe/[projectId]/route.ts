// Vibe-arcade cross-origin sandbox route (Seed 13, AC-F11 / AC-G1).
// Served under https://sandbox.aura-board.app/vibe/:projectId
// (mapped via Vercel project domain config; locally served under /sandbox/vibe/...).
//
// Flow:
//   1. Verify ?pt= HMAC play-token matches :projectId.
//   2. Look up VibeProject.htmlContent.
//   3. Return it wrapped with the postMessage bridge and CSP sandbox headers.

import { db } from "@/lib/db";
import { verifyPlayToken } from "@/lib/vibe-arcade/play-token";
import {
  SANDBOX_RESPONSE_HEADERS,
  renderSandboxHtml,
} from "@/lib/vibe-arcade/sandbox-renderer";

const PARENT_ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN ?? "http://localhost:3000";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const url = new URL(req.url);
  const token = url.searchParams.get("pt");
  if (!token) {
    return new Response("missing_token", { status: 400 });
  }

  const check = verifyPlayToken(token);
  if (!check.ok || check.projectId !== projectId) {
    return new Response("forbidden", { status: 403 });
  }

  const project = await db.vibeProject.findUnique({ where: { id: projectId } });
  if (!project) return new Response("not_found", { status: 404 });
  if (project.moderationStatus !== "approved") {
    return new Response("not_playable", { status: 409 });
  }

  const html = renderSandboxHtml({
    projectId,
    title: project.title,
    htmlContent: project.htmlContent,
    cssContent: project.cssContent,
    jsContent: project.jsContent,
    parentOrigin: PARENT_ORIGIN,
  });

  return new Response(html, { status: 200, headers: SANDBOX_RESPONSE_HEADERS });
}
