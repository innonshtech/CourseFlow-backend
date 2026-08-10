import { z } from "zod";

export const addToWishlistSchema = z.object({
  courseId: z
    .string()
    .min(1, "Course ID is required"),
});

export type AddToWishlistInput = z.infer<typeof addToWishlistSchema>;
