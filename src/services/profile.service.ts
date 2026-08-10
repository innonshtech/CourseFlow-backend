import { prisma } from "@/lib/prisma";
import { ApiError } from "@/types/api";
import { hashPassword, comparePassword } from "@/utils/password";
import { UpdateProfileSchemaInput, ChangePasswordSchemaInput } from "@/validators/profile";

export class ProfileService {
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profileImage: true,
        bio: true,
        phone: true,
        creatorDescription: true,
        displayName: true,
        website: true,
        youtube: true,
        linkedin: true,
        instagram: true,
        verificationStatus: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw ApiError.notFound("User profile not found");
    return user;
  }

  static async updateProfile(userId: string, input: UpdateProfileSchemaInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound("User profile not found");

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.profileImage !== undefined && { profileImage: input.profileImage }),
        ...(input.bio !== undefined && { bio: input.bio }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.creatorDescription !== undefined && { creatorDescription: input.creatorDescription }),
        ...(input.displayName !== undefined && { displayName: input.displayName }),
        ...(input.website !== undefined && { website: input.website }),
        ...(input.youtube !== undefined && { youtube: input.youtube }),
        ...(input.linkedin !== undefined && { linkedin: input.linkedin }),
        ...(input.instagram !== undefined && { instagram: input.instagram }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profileImage: true,
        bio: true,
        phone: true,
        creatorDescription: true,
        displayName: true,
        website: true,
        youtube: true,
        linkedin: true,
        instagram: true,
        verificationStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  static async changePassword(userId: string, input: ChangePasswordSchemaInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound("User profile not found");

    const isValid = await comparePassword(input.currentPassword, user.password);
    if (!isValid) throw ApiError.badRequest("Current password is incorrect");

    const newHashed = await hashPassword(input.newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: newHashed },
    });

    return true;
  }
}
