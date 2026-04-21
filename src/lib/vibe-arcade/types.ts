// Vibe-arcade shared types (Seed 13).
// API req/res shapes + realtime event union.

import { z } from "zod";

export const VIBE_TAGS = ["게임", "퀴즈", "시뮬", "아트", "기타"] as const;
export type VibeTag = (typeof VIBE_TAGS)[number];

export const MODERATION_STATUS = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "flagged",
  "hidden",
] as const;
export type ModerationStatus = (typeof MODERATION_STATUS)[number];

export const MODERATION_POLICY = [
  "teacher_approval_required",
  "auto_publish",
  "hybrid_trusted",
] as const;
export type ModerationPolicy = (typeof MODERATION_POLICY)[number];

export const REVIEW_AUTHOR_DISPLAY = [
  "named",
  "anonymous",
  "hidden_to_peer",
] as const;
export type ReviewAuthorDisplay = (typeof REVIEW_AUTHOR_DISPLAY)[number];

export const REVIEW_RATING_SYSTEM = ["stars_1_5", "thumbs", "emoji_5"] as const;
export type ReviewRatingSystem = (typeof REVIEW_RATING_SYSTEM)[number];

// ── Config patch schema (educator edits a subset of fields) ────────────
export const VibeArcadeConfigPatchSchema = z.object({
  enabled: z.boolean().optional(),
  moderationPolicy: z.enum(MODERATION_POLICY).optional(),
  perStudentDailyTokenCap: z.number().int().min(0).max(500_000).nullable().optional(),
  classroomDailyTokenPool: z.number().int().min(0).max(10_000_000).optional(),
  crossClassroomVisible: z.boolean().optional(),
  reviewAuthorDisplay: z.enum(REVIEW_AUTHOR_DISPLAY).optional(),
  reviewRatingSystem: z.enum(REVIEW_RATING_SYSTEM).optional(),
  allowRemix: z.boolean().optional(),
});
export type VibeArcadeConfigPatch = z.infer<typeof VibeArcadeConfigPatchSchema>;

// ── Project create/edit ────────────────────────────────────────────────
// 3-tab split (2026-04-21): htmlContent는 <body> 본문, cssContent / jsContent는
// 각각 <style>/<script>로 합성. 기존 단일 HTML 호출자는 css/js를 생략해도 ""
// default가 적용되어 하위 호환.
export const VibeProjectCreateSchema = z.object({
  boardId: z.string().min(1),
  sessionId: z.string().min(1),
  title: z.string().min(1).max(40),
  description: z.string().max(500).default(""),
  htmlContent: z.string().min(1).max(500_000),
  cssContent: z.string().max(200_000).default(""),
  jsContent: z.string().max(300_000).default(""),
  tags: z.array(z.enum(VIBE_TAGS)).min(1).max(1),
});
export type VibeProjectCreate = z.infer<typeof VibeProjectCreateSchema>;

export const VibeProjectEditSchema = z.object({
  title: z.string().min(1).max(40).optional(),
  description: z.string().max(500).optional(),
  tags: z.array(z.enum(VIBE_TAGS)).min(1).max(1).optional(),
  htmlContent: z.string().min(1).max(500_000).optional(),
  cssContent: z.string().max(200_000).optional(),
  jsContent: z.string().max(300_000).optional(),
});

// ── Review ─────────────────────────────────────────────────────────────
export const VibeReviewCreateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).default(""),
});
export type VibeReviewCreate = z.infer<typeof VibeReviewCreateSchema>;

// ── Play session ───────────────────────────────────────────────────────
export const VibePlaySessionCompleteSchema = z.object({
  completed: z.boolean(),
  reportedScore: z.number().int().min(0).max(10_000_000).optional(),
});

// ── Moderation action ──────────────────────────────────────────────────
export const VibeModerationActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().max(300).optional(),
});
export type VibeModerationAction = z.infer<typeof VibeModerationActionSchema>;

// ── Realtime event union (published via src/lib/realtime.ts) ──────────
export type VibeArcadeRealtimeEvent =
  | { type: "project.created"; projectId: string; boardId: string }
  | { type: "project.approved"; projectId: string; boardId: string }
  | { type: "project.rejected"; projectId: string; boardId: string; note?: string }
  | { type: "project.flagged"; projectId: string; boardId: string }
  | { type: "review.created"; projectId: string; ratingAvg: number | null; reviewCount: number }
  | { type: "quota.updated"; classroomId: string; used: number; pool: number };
