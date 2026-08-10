import { z } from "zod";
import { CourseLevel } from "@prisma/client";

/**
 * Converts a string into a URL-safe slug.
 * e.g. "React Complete Masterclass" → "react-complete-masterclass"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export const createCourseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(150, "Title cannot exceed 150 characters"),
  slug: z
    .string()
    .trim()
    .min(3, "Slug must be at least 3 characters")
    .max(160, "Slug cannot exceed 160 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and hyphens only"
    )
    .optional(),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description cannot exceed 5000 characters"),
  thumbnailUrl: z.string().url("Must be a valid image URL").optional().nullable().or(z.literal("")),
  price: z
    .number({ message: "Price must be a valid number" })
    .min(0, "Price cannot be negative"),
  discountPrice: z
    .number()
    .min(0, "Discount price cannot be negative")
    .optional()
    .nullable(),
  level: z.nativeEnum(CourseLevel, {
    message: "Invalid course level",
  }),
  language: z
    .string()
    .trim()
    .min(2, "Language must be at least 2 characters")
    .max(50, "Language cannot exceed 50 characters"),
  duration: z
    .string()
    .trim()
    .min(2, "Duration must be specified (e.g. 10 hours, 35 mins)")
    .max(50, "Duration cannot exceed 50 characters"),
  categoryId: z
    .string()
    .min(1, "Please select a category"),
  isFreePreview: z.boolean(),
  isPublished: z.boolean(),
}).refine(
  (data) => {
    if (data.discountPrice !== undefined && data.discountPrice !== null) {
      return data.discountPrice < data.price;
    }
    return true;
  },
  {
    message: "Discount price must be less than regular price",
    path: ["discountPrice"],
  }
);

export const updateCourseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(150, "Title cannot exceed 150 characters")
    .optional(),
  slug: z
    .string()
    .trim()
    .min(3, "Slug must be at least 3 characters")
    .max(160, "Slug cannot exceed 160 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and hyphens only"
    )
    .optional(),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description cannot exceed 5000 characters")
    .optional(),
  thumbnailUrl: z.string().url("Must be a valid image URL").optional().nullable().or(z.literal("")),
  price: z
    .number()
    .min(0, "Price cannot be negative")
    .optional(),
  discountPrice: z
    .number()
    .min(0, "Discount price cannot be negative")
    .optional()
    .nullable(),
  level: z.nativeEnum(CourseLevel).optional(),
  language: z
    .string()
    .trim()
    .min(2, "Language must be at least 2 characters")
    .max(50, "Language cannot exceed 50 characters")
    .optional(),
  duration: z
    .string()
    .trim()
    .min(2, "Duration must be specified")
    .max(50, "Duration cannot exceed 50 characters")
    .optional(),
  categoryId: z
    .string()
    .min(1, "Please select a category")
    .optional(),
  isFreePreview: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

export type CreateCourseSchemaInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseSchemaInput = z.infer<typeof updateCourseSchema>;
