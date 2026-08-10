import { z } from "zod";

export const createLessonSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(200, "Title must not exceed 200 characters"),
  description: z.string().optional().nullable(),
  videoUrl: z
    .string()
    .min(1, "Video URL or File is required"),
  pdfUrl: z.string().optional().nullable(),
  duration: z
    .number({ message: "Duration must be a number" })
    .int("Duration must be an integer")
    .min(0, "Duration cannot be negative")
    .optional()
    .nullable(),
  order: z
    .number({ message: "Order must be a number" })
    .int("Order must be an integer")
    .optional()
    .nullable(),
  isPreview: z.boolean(),
  isPublished: z.boolean(),
});

export const updateLessonSchema = createLessonSchema.partial();

export const reorderLessonItemSchema = z.object({
  id: z.string().min(1, "Lesson ID is required"),
  order: z.number().int().min(1, "Order must be a positive integer"),
});

export const reorderLessonsSchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),
  items: z
    .array(reorderLessonItemSchema)
    .min(1, "At least one item is required to reorder"),
});
