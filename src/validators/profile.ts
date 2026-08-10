import { z } from "zod";

const urlOrEmpty = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine(
    (val) => !val || val.length === 0 || /^https?:\/\/.+/.test(val),
    { message: "Must be a valid URL starting with http:// or https://" }
  );

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters"),
  phone: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (val) => !val || val.length === 0 || /^[\d\+\-\s\(\)]{7,20}$/.test(val),
      { message: "Please enter a valid phone number" }
    ),
  bio: z
    .string()
    .max(500, "Bio cannot exceed 500 characters")
    .optional()
    .nullable(),
  profileImage: z.string().optional().nullable(),

  // Creator specific fields
  creatorDescription: z
    .string()
    .max(1000, "Creator description cannot exceed 1000 characters")
    .optional()
    .nullable(),
  displayName: z
    .string()
    .max(50, "Display name cannot exceed 50 characters")
    .optional()
    .nullable(),
  website: urlOrEmpty,
  youtube: urlOrEmpty,
  linkedin: urlOrEmpty,
  instagram: urlOrEmpty,
});

export type UpdateProfileSchemaInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(100, "Password cannot exceed 100 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirm password do not match",
    path: ["confirmPassword"],
  });

export type ChangePasswordSchemaInput = z.infer<typeof changePasswordSchema>;
