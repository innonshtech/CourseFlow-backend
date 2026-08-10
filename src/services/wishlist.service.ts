import { prisma } from "../lib/prisma";
import { ApiError } from "../types/api";

export class WishlistService {
  /**
   * Get student's wishlist courses
   */
  static async getWishlist(userId: string) {
    const items = await prisma.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        course: {
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
            creator: {
              select: {
                id: true,
                name: true,
                profileImage: true,
              },
            },
            _count: {
              select: {
                lessons: {
                  where: { isPublished: true },
                },
              },
            },
          },
        },
      },
    });

    const formattedWishlist = items.map((item) => {
      const c = item.course;
      return {
        wishlistId: item.id,
        addedAt: item.createdAt,
        course: {
          id: c.id,
          title: c.title,
          slug: c.slug,
          description: c.description,
          price: c.price,
          discountPrice: c.discountPrice,
          thumbnailUrl: c.thumbnailUrl,
          level: c.level,
          language: c.language,
          isPublished: c.isPublished,
          isFreePreview: c.isFreePreview,
          duration: c.duration,
          averageRating: c.averageRating,
          totalStudents: c.totalStudents,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          category: c.category,
          creator: c.creator,
          totalLessons: c._count.lessons,
        },
      };
    });

    return {
      items: formattedWishlist,
      count: formattedWishlist.length,
    };
  }

  /**
   * Add a course to student's wishlist
   */
  static async addToWishlist(userId: string, courseId: string) {
    // 1. Verify course exists and is published
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, isPublished: true, title: true },
    });

    if (!course) {
      throw ApiError.notFound("Course not found");
    }

    if (!course.isPublished) {
      throw ApiError.badRequest("Cannot add unpublished course to wishlist");
    }

    // 2. Check for duplicate entry
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existing) {
      throw ApiError.conflict("Course is already in your wishlist");
    }

    // 3. Create wishlist item
    const newItem = await prisma.wishlist.create({
      data: {
        userId,
        courseId,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return newItem;
  }

  /**
   * Remove a course from student's wishlist
   */
  static async removeFromWishlist(userId: string, courseId: string) {
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!existing) {
      throw ApiError.notFound("Course is not in your wishlist");
    }

    await prisma.wishlist.delete({
      where: {
        id: existing.id,
      },
    });

    return { success: true };
  }
}
