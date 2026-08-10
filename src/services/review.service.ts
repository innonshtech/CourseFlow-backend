import { prisma } from "../lib/prisma";
import { ApiError } from "../types/api";
import { Role } from "../types/auth";
import { NotificationService } from "../services/notification.service";
import {
  CreateReviewInput,
  UpdateReviewInput,
  ReviewFilterParams,
  CourseReviewsResponse,
  RatingDistribution,
  Review,
} from "../types/review";

export class ReviewService {
  /**
   * Recalculate and update the average rating on the Course model
   */
  public static async recalculateCourseRating(courseId: string): Promise<number> {
    const aggregate = await prisma.review.aggregate({
      where: { courseId },
      _avg: { rating: true },
    });

    const rawAvg = aggregate._avg.rating || 0;
    const averageRating = Math.round(rawAvg * 10) / 10;

    await prisma.course.update({
      where: { id: courseId },
      data: { averageRating },
    });

    return averageRating;
  }

  /**
   * Submit a new review for a course (Enrolled students only, 1 per course)
   */
  static async createReview(userId: string, input: CreateReviewInput): Promise<Review> {
    const { courseId, rating, comment } = input;

    // 1. Verify course existence
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, isPublished: true },
    });

    if (!course) {
      throw ApiError.notFound("Course not found");
    }

    // 2. Verify student enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });

    if (!enrollment) {
      throw ApiError.forbidden("Only enrolled students can submit a review for this course");
    }

    // 3. Check duplicate review
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });

    if (existingReview) {
      throw ApiError.badRequest("You have already submitted a review for this course");
    }

    // 4. Create Review
    const review = await prisma.review.create({
      data: {
        userId,
        courseId,
        rating,
        comment: comment?.trim() || null,
      },
      include: {
        user: {
          select: { id: true, name: true, profileImage: true },
        },
        course: {
          select: { id: true, title: true, creatorId: true },
        },
      },
    });

    // 5. Update course average rating
    await this.recalculateCourseRating(courseId);

    // 6. Notify Creator
    if (review.course?.creatorId) {
      NotificationService.createNotification({
        recipientId: review.course.creatorId,
        recipientRole: Role.CREATOR,
        title: "New review received",
        message: `${review.user.name} left a ${rating}-star review on '${review.course.title}'.`,
        type: "NEW_REVIEW",
        link: "/creator/courses",
      });
    }

    return review;
  }

  /**
   * Fetch paginated & sorted reviews for a course with rating distribution breakdown
   */
  static async getCourseReviews(
    courseId: string,
    params: ReviewFilterParams = {},
    currentUserId?: string
  ): Promise<CourseReviewsResponse> {
    const { sort = "newest", page = 1, limit = 5 } = params;
    const skip = (page - 1) * limit;

    // Sorting strategy
    let orderBy: any = { createdAt: "desc" };
    if (sort === "highest") {
      orderBy = [{ rating: "desc" }, { createdAt: "desc" }];
    } else if (sort === "lowest") {
      orderBy = [{ rating: "asc" }, { createdAt: "desc" }];
    }

    const [reviews, total, groupCounts, userReviewRecord] = await Promise.all([
      prisma.review.findMany({
        where: { courseId },
        orderBy,
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, profileImage: true },
          },
        },
      }),
      prisma.review.count({ where: { courseId } }),
      prisma.review.groupBy({
        by: ["rating"],
        where: { courseId },
        _count: { rating: true },
      }),
      currentUserId
        ? prisma.review.findUnique({
            where: { userId_courseId: { userId: currentUserId, courseId } },
            include: {
              user: {
                select: { id: true, name: true, profileImage: true },
              },
            },
          })
        : null,
    ]);

    // Build rating distribution object
    const ratingDistribution: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    groupCounts.forEach((g) => {
      if (g.rating >= 1 && g.rating <= 5) {
        ratingDistribution[g.rating as 1 | 2 | 3 | 4 | 5] = g._count.rating;
      }
    });

    // Calculate average rating
    const totalRatingSum = groupCounts.reduce((acc, g) => acc + g.rating * g._count.rating, 0);
    const averageRating = total > 0 ? Math.round((totalRatingSum / total) * 10) / 10 : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      reviews,
      total,
      page,
      totalPages,
      averageRating,
      ratingDistribution,
      userReview: userReviewRecord,
    };
  }

  /**
   * Update an existing review (Author student only)
   */
  static async updateReview(
    userId: string,
    reviewId: string,
    input: UpdateReviewInput
  ): Promise<Review> {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw ApiError.notFound("Review not found");
    }

    if (review.userId !== userId) {
      throw ApiError.forbidden("You can only edit your own review");
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(input.rating !== undefined ? { rating: input.rating } : {}),
        ...(input.comment !== undefined ? { comment: input.comment.trim() || null } : {}),
      },
      include: {
        user: {
          select: { id: true, name: true, profileImage: true },
        },
      },
    });

    await this.recalculateCourseRating(review.courseId);

    return updated;
  }

  /**
   * Delete a review (Author student only)
   */
  static async deleteReview(userId: string, reviewId: string): Promise<boolean> {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw ApiError.notFound("Review not found");
    }

    if (review.userId !== userId) {
      throw ApiError.forbidden("You can only delete your own review");
    }

    await prisma.review.delete({
      where: { id: reviewId },
    });

    await this.recalculateCourseRating(review.courseId);

    return true;
  }
}
