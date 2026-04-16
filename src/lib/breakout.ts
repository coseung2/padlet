/**
 * Breakout domain helpers — structure parsing + board creation primitives.
 *
 * The `structure` JSON lives on BreakoutTemplate and is deep-cloned into
 * Section rows at board creation time. Template edits NEVER retroactively
 * affect existing boards (decisions.md Q6).
 */
import { z } from "zod";

export const SectionSpecSchema = z.object({
  title: z.string().min(1).max(100),
  role: z.enum(["group-copy", "role-expert", "role-home"]),
  defaultCards: z
    .array(
      z.object({
        title: z.string().max(200).default(""),
        content: z.string().max(5000).default(""),
      })
    )
    .optional(),
});

export const SharedSectionSpecSchema = z.object({
  title: z.string().min(1).max(100),
  role: z.literal("teacher-pool"),
});

export const TemplateStructureSchema = z.object({
  sectionsPerGroup: z.array(SectionSpecSchema).min(1).max(10),
  sharedSections: z.array(SharedSectionSpecSchema).optional(),
});

export type TemplateStructure = z.infer<typeof TemplateStructureSchema>;

/** Deep-clone to decouple Section rows from the source template JSON. */
export function cloneStructure(raw: unknown): TemplateStructure {
  const parsed = TemplateStructureSchema.parse(raw);
  return JSON.parse(JSON.stringify(parsed)) as TemplateStructure;
}

export const BreakoutVisibilitySchema = z.enum(["own-only", "peek-others"]);
export type BreakoutVisibility = z.infer<typeof BreakoutVisibilitySchema>;

export const BreakoutDeployModeSchema = z.enum([
  "link-fixed",
  "self-select",
  "teacher-assign",
]);
export type BreakoutDeployMode = z.infer<typeof BreakoutDeployModeSchema>;

export const BreakoutConfigSchema = z.object({
  templateId: z.string().min(1),
  groupCount: z.number().int().min(1).max(10),
  groupCapacity: z.number().int().min(1).max(6),
  visibilityOverride: BreakoutVisibilitySchema.nullable().optional(),
  deployMode: BreakoutDeployModeSchema.optional().default("link-fixed"),
});

export type BreakoutConfig = z.infer<typeof BreakoutConfigSchema>;

export function groupSectionTitle(groupIndex: number, sectionTitle: string): string {
  return `모둠 ${groupIndex} · ${sectionTitle}`;
}
