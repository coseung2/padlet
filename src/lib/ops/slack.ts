// Slack 이상징후 알림 (Seed 14 security, 2026-04-22).
// SLACK_WEBHOOK_URL 환경변수로 incoming webhook URL 설정 시 동작.
// 미설정이면 noop — 개발/staging에서 경고 없이 지나간다.
//
// 호출 예:
//   await notifySlack({
//     severity: "warn",
//     title: "webhook orphan",
//     detail: `unmatched orderId ${orderId}`,
//     context: { orderId, eventType },
//   });

import "server-only";

export type SlackSeverity = "info" | "warn" | "error";

export type SlackNotifyInput = {
  severity: SlackSeverity;
  title: string;
  detail?: string;
  context?: Record<string, unknown>;
};

const EMOJI_BY_SEVERITY: Record<SlackSeverity, string> = {
  info: ":information_source:",
  warn: ":warning:",
  error: ":rotating_light:",
};

/**
 * best-effort Slack 알림. 네트워크 실패·타임아웃은 삼킴 — 주 로직 차단 금지.
 * SLACK_WEBHOOK_URL 미설정이면 즉시 반환.
 */
export async function notifySlack(input: SlackNotifyInput): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;

  const emoji = EMOJI_BY_SEVERITY[input.severity];
  const deployUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "local";

  const lines = [
    `${emoji} *${input.title}*`,
    `_env_: ${deployUrl} · _severity_: ${input.severity}`,
  ];
  if (input.detail) lines.push(input.detail);
  if (input.context) {
    const pretty = Object.entries(input.context)
      .map(([k, v]) => `• ${k}: \`${typeof v === "object" ? JSON.stringify(v) : String(v)}\``)
      .join("\n");
    if (pretty) lines.push(pretty);
  }

  const body = JSON.stringify({ text: lines.join("\n") });

  try {
    // 3초 타임아웃 — Slack 장애가 주 로직을 막지 못하게.
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 3000);
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    }).catch(() => {}); // 네트워크 실패 삼킴
    clearTimeout(t);
  } catch {
    // 삼킴 — Slack alerting이 주 로직 fault의 원인이 되면 안 됨
  }
}
