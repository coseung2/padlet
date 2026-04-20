// Vibe-arcade moderation filter (Seed 13, AC-G2 / AC-G3).
// 1차 방어선: 금칙어 regex + 개인정보 패턴 + 블랙리스트 HTML 태그 스캔.
// 최종 방어선은 교사 승인 게이트(moderationPolicy=teacher_approval_required).

const BLOCKLIST = [
  // 욕설·비속어 최소 셋 — 학급 운영 중 갱신 가능.
  /씨발/gi,
  /개새[끼기]/gi,
  /좆/gi,
  /존나/gi,
  /fuck/gi,
  /shit/gi,
];

const PII_PATTERNS: Array<{ kind: string; re: RegExp }> = [
  { kind: "phone_kr", re: /01[016789][-\s]?\d{3,4}[-\s]?\d{4}/g },
  { kind: "rrn_kr", re: /\d{6}[-\s]?[1-4]\d{6}/g },
  { kind: "email", re: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
];

const HTML_BLACKLIST_TAGS = ["iframe", "object", "embed", "frame", "frameset"];
const JS_SCHEME_RE = /\bjavascript:/gi;
const DATA_HTML_RE = /\bdata:text\/html/gi;

// Whitelisted CDN origins for external scripts/styles (AC-G? / R-11).
export const CDN_WHITELIST = [
  "cdn.jsdelivr.net",
  "cdnjs.cloudflare.com",
  "unpkg.com",
];

export type ModerationFilterHit = {
  kind: "profanity" | "pii" | "html_tag" | "js_scheme" | "data_html" | "external_url";
  detail: string;
};

export type ModerationFilterResult = {
  pass: boolean;
  hits: ModerationFilterHit[];
};

/** Scan user-authored text (prompt or review comment) for profanity + PII. */
export function scanText(input: string): ModerationFilterResult {
  const hits: ModerationFilterHit[] = [];
  for (const re of BLOCKLIST) {
    const m = input.match(re);
    if (m) hits.push({ kind: "profanity", detail: m[0] });
  }
  for (const { kind, re } of PII_PATTERNS) {
    const m = input.match(re);
    if (m) hits.push({ kind: "pii", detail: `${kind}:${m[0]}` });
  }
  return { pass: hits.length === 0, hits };
}

/** Scan HTML artifact from Sonnet for unsafe tags + schemes + external URLs. */
export function scanHtml(html: string): ModerationFilterResult {
  const hits: ModerationFilterHit[] = [];

  for (const tag of HTML_BLACKLIST_TAGS) {
    const re = new RegExp(`<\\s*${tag}\\b`, "i");
    if (re.test(html)) hits.push({ kind: "html_tag", detail: tag });
  }

  if (JS_SCHEME_RE.test(html)) hits.push({ kind: "js_scheme", detail: "javascript:" });
  if (DATA_HTML_RE.test(html)) hits.push({ kind: "data_html", detail: "data:text/html" });

  // External URL whitelist check. Matches src/href targeting external hosts.
  const urlRe = /(?:src|href)\s*=\s*["']https?:\/\/([^"'/\s]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(html)) !== null) {
    const host = m[1].toLowerCase();
    if (!CDN_WHITELIST.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
      hits.push({ kind: "external_url", detail: host });
    }
  }

  return { pass: hits.length === 0, hits };
}
