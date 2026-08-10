import { Role } from "../types/auth";

export interface UserSocialLinks {
  website?: string | null;
  youtube?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
}

export interface UserProfileDto {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  profileImage?: string | null;
  bio?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;

  // Creator specific fields
  creatorDescription?: string | null;
  displayName?: string | null;
  termsAccepted?: boolean;
  website?: string | null;
  youtube?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
}

export interface UpdateProfileInput {
  name: string;
  phone?: string | null;
  bio?: string | null;
  profileImage?: string | null;
  creatorDescription?: string | null;
  displayName?: string | null;
  website?: string | null;
  youtube?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
