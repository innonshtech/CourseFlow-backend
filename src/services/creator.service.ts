import { prisma } from "@/lib/prisma";
import { Role, CreatorVerificationStatus } from "@prisma/client";

export interface CreatorProfile {
  id: string;
  name: string;
  email: string;
  profileImage: string | null;
  bio: string | null;
  creatorDescription: string | null;
  displayName: string | null;
  website: string | null;
  youtube: string | null;
  linkedin: string | null;
  instagram: string | null;
  publishedCoursesCount: number;
  totalStudents?: number;
  rating?: number;
}

export class CreatorService {
  /**
   * Fetches featured/approved course creators with course count, total students, and rating.
   * STRICT SECURITY: Only returns APPROVED creators (or null status legacy creators).
   */
  static async getFeaturedCreators(limit = 50): Promise<CreatorProfile[]> {
    const creators = await prisma.user.findMany({
      where: {
        role: Role.CREATOR,
        OR: [
          { verificationStatus: CreatorVerificationStatus.APPROVED },
          { verificationStatus: null },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true,
        bio: true,
        creatorDescription: true,
        displayName: true,
        website: true,
        youtube: true,
        linkedin: true,
        instagram: true,
        createdAt: true,
        createdCourses: {
          where: {
            isPublished: true,
          },
          select: {
            id: true,
            totalStudents: true,
            averageRating: true,
          },
        },
      },
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    });

    const mappedCreators = creators.map((creator) => {
      const publishedCoursesCount = creator.createdCourses.length;
      let totalStudents = 0;
      let totalRatingSum = 0;
      let ratedCoursesCount = 0;

      for (const course of creator.createdCourses) {
        totalStudents += course.totalStudents || 0;
        if (course.averageRating && course.averageRating > 0) {
          totalRatingSum += course.averageRating;
          ratedCoursesCount += 1;
        }
      }

      const rating =
        ratedCoursesCount > 0
          ? Number((totalRatingSum / ratedCoursesCount).toFixed(1))
          : undefined;

      const { createdCourses, ...rest } = creator;
      return {
        ...rest,
        publishedCoursesCount,
        totalStudents,
        rating,
      };
    });

    // Multi-tier Quality Sorting:
    // 1. Primary: Higher average rating first (unrated creators treated as 0 rating)
    // 2. Secondary: Higher total enrolled students first
    // 3. Tertiary: Higher number of published courses first
    // 4. Quaternary: Newest creator last if all above values are equal
    mappedCreators.sort((a, b) => {
      const aRating = a.rating ?? 0;
      const bRating = b.rating ?? 0;
      if (bRating !== aRating) {
        return bRating - aRating;
      }

      const aStudents = a.totalStudents ?? 0;
      const bStudents = b.totalStudents ?? 0;
      if (bStudents !== aStudents) {
        return bStudents - aStudents;
      }

      if (b.publishedCoursesCount !== a.publishedCoursesCount) {
        return b.publishedCoursesCount - a.publishedCoursesCount;
      }

      const aTime = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
      const bTime = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
      return aTime - bTime;
    });

    return mappedCreators;
  }

  /**
   * Fetches single creator profile by ID.
   */
  static async getCreatorById(id: string): Promise<CreatorProfile | null> {
    const creator = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true,
        bio: true,
        creatorDescription: true,
        displayName: true,
        website: true,
        youtube: true,
        linkedin: true,
        instagram: true,
        createdCourses: {
          where: { isPublished: true },
          select: {
            id: true,
            totalStudents: true,
            averageRating: true,
          },
        },
      },
    });

    if (!creator) return null;

    const publishedCoursesCount = creator.createdCourses.length;
    let totalStudents = 0;
    let totalRatingSum = 0;
    let ratedCoursesCount = 0;

    for (const course of creator.createdCourses) {
      totalStudents += course.totalStudents || 0;
      if (course.averageRating && course.averageRating > 0) {
        totalRatingSum += course.averageRating;
        ratedCoursesCount += 1;
      }
    }

    const rating =
      ratedCoursesCount > 0
        ? Number((totalRatingSum / ratedCoursesCount).toFixed(1))
        : undefined;

    const { createdCourses, ...rest } = creator;
    return {
      ...rest,
      publishedCoursesCount,
      totalStudents,
      rating,
    };
  }
}
