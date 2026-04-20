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
 * Wraps the student-authored HTML with a small bridge that posts
 * `{type:"completed"}` on user interaction. The bridge origin is the sandbox
 * subdomain itself; the parent must verify `event.origin` against that.
 */
export function renderSandboxHtml(args: {
  projectId: string;
  title: string;
  htmlContent: string;
  parentOrigin: string; // e.g. https://aura-board.app (or preview URL)
}): string {
  const escapedTitle = args.title.replace(/[<>&"']/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === '"' ? "&quot;" : "&#39;",
  );

  // The bridge script is trusted (server-emitted). Student HTML is appended after.
  const bridge = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapedTitle}</title>
<style>html,body{margin:0;padding:0;height:100%;background:#000;color:#fff;font-family:system-ui,sans-serif}</style>
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
</body>
</html>`;
  return bridge;
}
