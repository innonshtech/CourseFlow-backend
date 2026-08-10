import { prisma } from "../lib/prisma";

export interface CreatorDashboardData {
  stats: {
    totalCourses: number;
    publishedCourses: number;
    draftCourses: number;
    totalStudents: number;
    totalRevenue: number;
    averageRating: number;
    totalPosts: number;
    totalReviews: number;
  };
  revenueOverview: Array<{
    label: string;
    revenue: number;
    ordersCount: number;
  }>;
  recentEnrollments: Array<{
    id: string;
    studentName: string;
    studentEmail: string;
    studentImage: string | null;
    courseTitle: string;
    enrolledAt: Date;
  }>;
  topPerformingCourses: Array<{
    id: string;
    title: string;
    thumbnailUrl: string | null;
    enrolledCount: number;
    revenue: number;
    averageRating: number;
  }>;
  recentReviews: Array<{
    id: string;
    studentName: string;
    studentImage: string | null;
    courseTitle: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
  }>;
}

export class CreatorDashboardService {
  /**
   * Fetches aggregated dashboard data for an authenticated creator.
   * Security: All database queries filter strictly by creatorId.
   */
  static async getDashboardData(creatorId: string): Promise<CreatorDashboardData> {
    // 1. Fetch courses created by this creator
    const creatorCourses = await prisma.course.findMany({
      where: { creatorId },
      include: {
        _count: {
          select: {
            enrollments: true,
            reviews: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalCourses = creatorCourses.length;
    const publishedCourses = creatorCourses.filter((c) => c.isPublished).length;
    const draftCourses = totalCourses - publishedCourses;
    const courseIds = creatorCourses.map((c) => c.id);

    if (courseIds.length === 0) {
      return {
        stats: {
          totalCourses: 0,
          publishedCourses: 0,
          draftCourses: 0,
          totalStudents: 0,
          totalRevenue: 0,
          averageRating: 0,
          totalPosts: 0,
          totalReviews: 0,
        },
        revenueOverview: [],
        recentEnrollments: [],
        topPerformingCourses: [],
        recentReviews: [],
      };
    }

    // 2. Fetch successful OrderItems for creator's courses
    const orderItems = await prisma.orderItem.findMany({
      where: {
        courseId: { in: courseIds },
        order: { status: "SUCCESS" },
      },
      include: {
        order: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        course: { select: { id: true, title: true } },
      },
      orderBy: { order: { createdAt: "desc" } },
    });

    let totalRevenue = 0;
    const revenueByCourse: Record<string, number> = {};
    orderItems.forEach((item) => {
      totalRevenue += item.price;
      revenueByCourse[item.courseId] = (revenueByCourse[item.courseId] || 0) + item.price;
    });

    // 3. Fetch enrollments for creator's courses
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: { in: courseIds } },
      include: {
        user: { select: { name: true, email: true, profileImage: true } },
        course: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const uniqueStudents = new Set(enrollments.map((e) => e.userId));
    const totalStudents = uniqueStudents.size;

    const enrollmentsByCourse: Record<string, number> = {};
    enrollments.forEach((e) => {
      enrollmentsByCourse[e.courseId] = (enrollmentsByCourse[e.courseId] || 0) + 1;
    });

    // 4. Fetch reviews for creator's courses
    const reviews = await prisma.review.findMany({
      where: { courseId: { in: courseIds } },
      include: {
        user: { select: { name: true, profileImage: true } },
        course: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalReviewsCount = reviews.length;
    const sumRating = reviews.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = totalReviewsCount > 0 ? Number((sumRating / totalReviewsCount).toFixed(1)) : 0;

    const totalPosts = await prisma.communityPost.count({
      where: { courseId: { in: courseIds } },
    });

    // 5. Revenue Overview (Last 30 days grouped by week/day)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const daysMap: Record<string, { revenue: number; ordersCount: number }> = {};
    // Initialize 6 interval labels for last 30 days
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 6);
      const label = d.toLocaleDateString("default", { month: "short", day: "numeric" });
      daysMap[label] = { revenue: 0, ordersCount: 0 };
    }

    orderItems.forEach((item) => {
      if (item.order.createdAt >= thirtyDaysAgo) {
        const label = item.order.createdAt.toLocaleDateString("default", { month: "short", day: "numeric" });
        if (!daysMap[label]) {
          daysMap[label] = { revenue: 0, ordersCount: 0 };
        }
        daysMap[label].revenue += item.price;
        daysMap[label].ordersCount += 1;
      }
    });

    const revenueOverview = Object.entries(daysMap).map(([label, data]) => ({
      label,
      revenue: data.revenue,
      ordersCount: data.ordersCount,
    }));

    // 6. Recent Enrollments (Top 5)
    const recentEnrollments = enrollments.slice(0, 5).map((e) => ({
      id: e.id,
      studentName: e.user.name,
      studentEmail: e.user.email,
      studentImage: e.user.profileImage,
      courseTitle: e.course.title,
      enrolledAt: e.createdAt,
    }));

    // 7. Top Performing Courses (Top 5 sorted by revenue & enrollments)
    const topPerformingCourses = creatorCourses
      .map((c) => ({
        id: c.id,
        title: c.title,
        thumbnailUrl: c.thumbnailUrl,
        enrolledCount: enrollmentsByCourse[c.id] || c._count.enrollments,
        revenue: revenueByCourse[c.id] || 0,
        averageRating: c.averageRating,
      }))
      .sort((a, b) => b.revenue - a.revenue || b.enrolledCount - a.enrolledCount)
      .slice(0, 5);

    // 8. Recent Reviews (Top 5)
    const recentReviews = reviews.slice(0, 5).map((r) => ({
      id: r.id,
      studentName: r.user.name,
      studentImage: r.user.profileImage,
      courseTitle: r.course.title,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    }));

    return {
      stats: {
        totalCourses,
        publishedCourses,
        draftCourses,
        totalStudents,
        totalRevenue,
        averageRating,
        totalPosts,
        totalReviews: totalReviewsCount,
      },
      revenueOverview,
      recentEnrollments,
      topPerformingCourses,
      recentReviews,
    };
  }
}
