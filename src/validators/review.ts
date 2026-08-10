import { z } from "zod";

export const createReviewSchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),
  rating: z
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be at least 1 star")
    .max(5, "Rating cannot exceed 5 stars"),
  comment: z
    .string()
    .max(1000, "Review comment cannot exceed 1000 characters")
    .optional(),
});

export const updateReviewSchema = z.object({
  rating: z
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be at least 1 star")
    .max(5, "Rating cannot exceed 5 stars")
    .optional(),
  comment: z
    .string()
    .max(1000, "Review comment cannot exceed 1000 characters")
    .optional(),
});

export type CreateReviewSchemaInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewSchemaInput = z.infer<typeof updateReviewSchema>;
