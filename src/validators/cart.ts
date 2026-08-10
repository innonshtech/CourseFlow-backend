import { z } from "zod";

export const addToCartSchema = z.object({
  courseId: z
    .string()
    .min(1, "Course ID is required"),
});

export const applyCouponSchema = z.object({
  code: z
    .string()
    .min(1, "Coupon code is required")
    .transform((val) => val.trim().toUpperCase()),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
