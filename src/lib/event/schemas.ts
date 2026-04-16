/**
 * Zod schemas for event-signup (ES-2, ES-3, ES-5).
 *
 * These schemas validate both teacher-authored config (customQuestions, event
 * metadata) and public applicant submissions. Server routes ALWAYS parse
 * through these — never trust raw bodies.
 */
import { z } from "zod";

export const questionTypeSchema = z.enum(["text", "long", "select", "radio", "checkbox"]);
export type QuestionType = z.infer<typeof questionTypeSchema>;

export const customQuestionSchema = z.object({
  id: z.string().min(1).max(64),
  type: questionTypeSchema,
  label: z.string().min(1).max(200),
  required: z.boolean().default(false),
  options: z.array(z.string().max(200)).max(30).optional(), // for select/radio/checkbox
});
export type CustomQuestion = z.infer<typeof customQuestionSchema>;

export const customQuestionsSchema = z.array(customQuestionSchema).max(30);

export const teamMemberSchema = z.object({
  name: z.string().min(1).max(60),
  grade: z.number().int().min(0).max(12).optional(),
  class: z.number().int().min(0).max(30).optional(),
  number: z.number().int().min(0).max(200).optional(),
});
export type TeamMember = z.infer<typeof teamMemberSchema>;

export const announceModeSchema = z.enum(["public-list", "private-search", "private"]);
export const videoPolicySchema = z.enum(["none", "optional", "required"]);
export const accessModeSchema = z.enum(["classroom", "public-link"]);
export const submissionStatusSchema = z.enum([
  "pending_approval",
  "submitted",
  "approved",
  "rejected",
  // legacy assignment states still permitted for backward compat:
  "reviewed",
  "returned",
]);

/** Teacher event metadata update payload. All fields optional for partial PATCH. */
export const eventMetadataSchema = z.object({
  layout: z.literal("event-signup").optional(),
  accessMode: accessModeSchema.optional(),
  eventPosterUrl: z.string().url().max(1000).nullable().optional(),
  applicationStart: z.string().datetime().nullable().optional(),
  applicationEnd: z.string().datetime().nullable().optional(),
  eventStart: z.string().datetime().nullable().optional(),
  eventEnd: z.string().datetime().nullable().optional(),
  venue: z.string().max(200).nullable().optional(),
  maxSelections: z.number().int().positive().max(10000).nullable().optional(),
  videoPolicy: videoPolicySchema.optional(),
  videoProviders: z.string().max(200).optional(),
  maxVideoDurationSec: z.number().int().positive().max(7200).nullable().optional(),
  maxVideoSizeMb: z.number().int().positive().max(5000).nullable().optional(),
  allowTeam: z.boolean().optional(),
  maxTeamSize: z.number().int().positive().max(50).nullable().optional(),
  customQuestions: customQuestionsSchema.optional(),
  announceMode: announceModeSchema.optional(),
  requireApproval: z.boolean().optional(),
  askName: z.boolean().optional(),
  askGradeClass: z.boolean().optional(),
  askStudentNumber: z.boolean().optional(),
  askContact: z.boolean().optional(),
});
export type EventMetadata = z.infer<typeof eventMetadataSchema>;

/** Applicant submit payload. applicant* and team* fields are optional because
 *  which are required depends on board.ask* flags — enforced in the route. */
export const submitPayloadSchema = z.object({
  boardId: z.string().min(1),
  token: z.string().min(1).max(64), // Board.accessToken
  applicantName: z.string().min(1).max(60).optional(),
  applicantGrade: z.number().int().min(0).max(12).optional(),
  applicantClass: z.number().int().min(0).max(30).optional(),
  applicantNumber: z.number().int().min(0).max(200).optional(),
  applicantContact: z.string().max(100).optional(),
  teamName: z.string().max(100).optional(),
  teamMembers: z.array(teamMemberSchema).max(20).optional(),
  answers: z.record(z.string(), z.unknown()).optional(),
  videoUrl: z.string().url().max(1000).optional(),
  videoProvider: z.enum(["youtube", "cfstream"]).optional(),
  videoId: z.string().max(200).optional(),
  captchaToken: z.string().optional(),
});
export type SubmitPayload = z.infer<typeof submitPayloadSchema>;

export const updateMyPayloadSchema = submitPayloadSchema
  .omit({ token: true })
  .extend({ submitToken: z.string().min(1).max(64) });

export const reviewPayloadSchema = z.object({
  submissionId: z.string().min(1),
  score: z.number().int().min(0).max(100),
  comment: z.string().max(2000).default(""),
});

export const submissionStatusUpdateSchema = z.object({
  submissionId: z.string().min(1),
  status: submissionStatusSchema,
});

export const lookupPayloadSchema = z.object({
  boardId: z.string().min(1),
  name: z.string().min(1).max(60),
  number: z.number().int().min(0).max(200),
});

export function parseCustomQuestions(raw: string | null | undefined): CustomQuestion[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return customQuestionsSchema.parse(parsed);
  } catch {
    return [];
  }
}
