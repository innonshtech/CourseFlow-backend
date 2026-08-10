import { z } from "zod";

export const updateLessonProgressSchema = z.object({
  lessonId: z.string().min(1, "Lesson ID is required"),
  isCompleted: z.boolean().optional(),
});

export type UpdateLessonProgressSchemaInput = z.infer<typeof updateLessonProgressSchema>;
