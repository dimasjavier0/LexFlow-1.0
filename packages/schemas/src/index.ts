import { z } from "zod";

export const cefrLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
export const learningStatusSchema = z.enum(["WANT_TO_LEARN", "NOT_INTERESTED", "LEARNED"]);

export const createCollectionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(500).optional(),
  isPublished: z.boolean().optional(),
});

export const createWordSchema = z.object({
  term: z.string().trim().min(1).max(100),
  translationEs: z.string().trim().min(1).max(200),
  level: cefrLevelSchema.default("A1"),
  isPublished: z.boolean().optional(),
});

export const updateLearningProgressSchema = z.object({
  status: learningStatusSchema,
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type CreateWordInput = z.infer<typeof createWordSchema>;
export type UpdateLearningProgressInput = z.infer<typeof updateLearningProgressSchema>;
