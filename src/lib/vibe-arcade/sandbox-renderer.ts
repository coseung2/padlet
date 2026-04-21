// Vibe-arcade cross-origin sandbox HTML renderer (Seed 13, AC-F8 / AC-G1 / R-1 / R-11).
// Served from https://sandbox.aura-board.app/vibe/{projectId}.
// Returns the response headers + wrapped HTML. Caller (route handler) applies them.

import { CDN_WHITELIST } from "./moderation-filter";

const CSP_DIRECTIVES = [
  // Sandbox without allow-same-origin: blocks cookie/localStorage access to the parent.
  // allow-scripts only — no forms/popups/modals/top-nav by default.
  "sandbox allow-scripts",
  // Prevent the artifact from embedding anything (even itself).
  "frame-src 'none'",
  // Allow inline scripts/styles (artifacts rely on them) + whitelisted CDNs.
  `default-src 'self' ${CDN_WHITELIST.map((c) => `https://${c}`).join(" ")}`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${CDN_WHITELIST.map((c) => `https://${c}`).join(" ")}`,
  `style-src 'self' 'unsafe-inline' ${CDN_WHITELIST.map((c) => `https://${c}`).join(" ")}`,
  `img-src 'self' data: blob: ${CDN_WHITELIST.map((c) => `https://${c}`).join(" ")}`,
  `connect-src 'self'`,
  `base-uri 'none'`,
  `object-src 'none'`,
];

export const SANDBOX_RESPONSE_HEADERS: Record<string, string> = {
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy": CSP_DIRECTIVES.join("; "),
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "SAMEORIGIN", // Parent page on aura-board.app (same-site) can still embed.
};

/**
 * Wraps the student-authored HTML/CSS/JS with a small bridge that posts
 * `{type:"completed"}` on user interaction. The bridge origin is the sandbox
 * subdomain itself; the parent must verify `event.origin` against that.
 *
 * 3-tab split (2026-04-21): args.htmlContent는 <body> 본문, args.cssContent는
 * 선택적 student <style>, args.jsContent는 선택적 student <script>. 기존 단일
 * HTML 호출자는 css/js를 생략하거나 ""로 전달해도 동일하게 동작한다.
 */
export function renderSandboxHtml(args: {
  projectId: string;
  title: string;
  htmlContent: string;
  cssContent?: string;
  jsContent?: string;
  parentOrigin: string; // e.g. https://aura-board.app (or preview URL)
}): string {
  const escapedTitle = args.title.replace(/[<>&"']/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === '"' ? "&quot;" : "&#39;",
  );

  // CSS/JS 블록은 존재할 때만 태그 생성 — 빈 style/script 노드를 남기지 않음.
  const studentStyle = args.cssContent && args.cssContent.trim().length > 0
    ? `<style>\n${args.cssContent}\n</style>`
    : "";
  const studentScript = args.jsContent && args.jsContent.trim().length > 0
    ? `<script>\n${args.jsContent}\n</script>`
    : "";

  // The bridge script is trusted (server-emitted). Student HTML is appended after.
  const bridge = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapedTitle}</title>
<style>html,body{margin:0;padding:0;height:100%;background:#000;color:#fff;font-family:system-ui,sans-serif}</style>
${studentStyle}
<script>
(function(){
  // Bridge — parent receives play completion events.
  var PARENT_ORIGIN = ${JSON.stringify(args.parentOrigin)};
  window.auraVibe = {
    complete: function(opts){
      try { parent.postMessage({ type: "completed", reportedScore: opts && opts.score }, PARENT_ORIGIN); } catch(_) {}
    },
    report: function(opts){
      try { parent.postMessage({ type: "report", detail: opts && opts.detail }, PARENT_ORIGIN); } catch(_) {}
    }
  };
})();
</script>
</head>
<body>
${args.htmlContent}
${studentScript}
</body>
</html>`;
  return bridge;
}

/**
 * Client-side srcDoc builder for VibeStudio live preview. Same shape as
 * renderSandboxHtml but without the bridge/postMessage plumbing — the
 * editor iframe doesn't talk to the page.
 */
export function buildStudioSrcDoc(args: {
  htmlContent: string;
  cssContent?: string;
  jsContent?: string;
}): string {
  const studentStyle = args.cssContent && args.cssContent.trim().length > 0
    ? `<style>\n${args.cssContent}\n</style>`
    : "";
  const studentScript = args.jsContent && args.jsContent.trim().length > 0
    ? `<script>\n${args.jsContent}\n</script>`
    : "";
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>html,body{margin:0;padding:0;height:100%;background:#fff;color:#111;font-family:system-ui,sans-serif}</style>
${studentStyle}
</head>
<body>
${args.htmlContent}
${studentScript}
</body>
</html>`;
}
