/**
 * Spam throttle for public event-signup submissions (ES-11).
 *
 * Rule: per (boardId, ipHash), no more than 5 submissions in the last 1 hour.
 * Implementation counts existing Submission rows — no external cache needed.
 * This is best-effort: a motivated attacker can rotate IPs, but combined with
 * hCaptcha (when configured) it raises the bar meaningfully for classroom abuse.
 */
import { db } from "../db";

export const THROTTLE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const THROTTLE_MAX = 5;

export async function checkThrottle(boardId: string, ipHash: string): Promise<{ ok: boolean; count: number }> {
  const since = new Date(Date.now() - THROTTLE_WINDOW_MS);
  const count = await db.submission.count({
    where: {
      boardId,
      ipHash,
      createdAt: { gte: since },
    },
  });
  return { ok: count < THROTTLE_MAX, count };
}
