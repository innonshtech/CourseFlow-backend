import { prisma } from "../lib/prisma";

export interface CreatorAnalyticsSummary {
  overview: {
    totalCourses: number;
    publishedCourses: number;
    draftCourses: number;
    totalStudentsEnrolled: number;
    totalRevenue: number;
    totalReviews: number;
    averageRating: number;
  };
  courseBreakdown: Array<{
    id: string;
    title: string;
    slug: string;
    thumbnailUrl: string | null;
    price: number;
    discountPrice: number | null;
    isPublished: boolean;
    categoryName: string;
    revenue: number;
    enrollmentsCount: number;
    reviewsCount: number;
    averageRating: number;
    completionRate: number;
    lastEnrollmentDate: Date | null;
    enrolledStudents: Array<{
      id: string;
      userId: string;
      name: string;
      email: string;
      profileImage: string | null;
      enrolledAt: Date;
      lastActivity: Date;
      progressPercent: number;
      status: "In Progress" | "Completed";
    }>;
  }>;
  topPerformingCourses: Array<{
    id: string;
    title: string;
    revenue: number;
    enrollmentsCount: number;
    averageRating: number;
    thumbnailUrl: string | null;
  }>;
  recentPayments: Array<{
    id: string;
    paymentId: string | null;
    amount: number;
    status: string;
    courseTitle: string;
    studentName: string;
    studentEmail: string;
    createdAt: Date;
  }>;
  recentEnrollments: Array<{
    id: string;
    studentName: string;
    studentEmail: string;
    studentImage: string | null;
    courseTitle: string;
    enrolledAt: Date;
  }>;
  charts: {
    revenueTrend: Array<{ label: string; revenue: number; ordersCount: number }>;
    enrollmentsTrend: Array<{ label: string; enrollments: number }>;
    popularCourses: Array<{ title: string; enrollments: number; revenue: number }>;
    categoryDistribution: Array<{ categoryName: string; count: number; percentage: number }>;
  };
}

export class CreatorAnalyticsService {
  /**
   * Fetches complete analytics data for a specific creator.
   * All metrics are strictly filtered by creatorId.
   */
  static async getCreatorAnalytics(creatorId: string): Promise<CreatorAnalyticsSummary> {
    // 1. Fetch all courses belonging to this creator
    const creatorCourses = await prisma.course.findMany({
      where: { creatorId },
      include: {
        category: { select: { id: true, name: true } },
        _count: {
          select: {
            enrollments: true,
            reviews: true,
            lessons: true,
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
      // Empty state default
      return {
        overview: {
          totalCourses: 0,
          publishedCourses: 0,
          draftCourses: 0,
          totalStudentsEnrolled: 0,
          totalRevenue: 0,
          totalReviews: 0,
          averageRating: 0,
        },
        courseBreakdown: [],
        topPerformingCourses: [],
        recentPayments: [],
        recentEnrollments: [],
        charts: {
          revenueTrend: [],
          enrollmentsTrend: [],
          popularCourses: [],
          categoryDistribution: [],
        },
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
            payment: { select: { razorpayPaymentId: true, status: true, createdAt: true } },
          },
        },
        course: { select: { id: true, title: true } },
      },
      orderBy: { order: { createdAt: "desc" } },
    });

    // Calculate total revenue and per-course revenue
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
        user: { select: { id: true, name: true, email: true, profileImage: true } },
        course: {
          select: {
            id: true,
            title: true,
            totalLessons: true,
            lessons: { where: { isPublished: true }, select: { id: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const uniqueStudents = new Set(enrollments.map((e) => e.userId));
    const totalStudentsEnrolled = uniqueStudents.size;

    const enrollmentsByCourse: Record<string, number> = {};
    enrollments.forEach((e) => {
      enrollmentsByCourse[e.courseId] = (enrollmentsByCourse[e.courseId] || 0) + 1;
    });

    // Compute completed lesson progress for students in creator's courses
    const completedProgress = await prisma.lessonProgress.findMany({
      where: {
        userId: { in: Array.from(uniqueStudents) },
        isCompleted: true,
        lesson: { courseId: { in: courseIds } },
      },
      select: {
        userId: true,
        lesson: { select: { courseId: true } },
      },
    });

    const completedCountsMap: Record<string, number> = {};
    completedProgress.forEach((p) => {
      const key = `${p.userId}_${p.lesson.courseId}`;
      completedCountsMap[key] = (completedCountsMap[key] || 0) + 1;
    });

    const courseEnrollmentsMap: Record<
      string,
      Array<{
        id: string;
        userId: string;
        name: string;
        email: string;
        profileImage: string | null;
        enrolledAt: Date;
        lastActivity: Date;
        progressPercent: number;
        status: "In Progress" | "Completed";
      }>
    > = {};

    enrollments.forEach((e) => {
      const totalLessons = e.course.lessons?.length || e.course.totalLessons || 0;
      const completedCount = completedCountsMap[`${e.userId}_${e.courseId}`] || 0;
      const progressPercent =
        totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;
      const isCompleted = progressPercent >= 100;

      const studentEntry = {
        id: e.id,
        userId: e.user.id,
        name: e.user.name,
        email: e.user.email,
        profileImage: e.user.profileImage,
        enrolledAt: e.createdAt,
        lastActivity: e.createdAt,
        progressPercent,
        status: (isCompleted ? "Completed" : "In Progress") as "In Progress" | "Completed",
      };

      if (!courseEnrollmentsMap[e.courseId]) {
        courseEnrollmentsMap[e.courseId] = [];
      }
      courseEnrollmentsMap[e.courseId].push(studentEntry);
    });

    // 4. Fetch reviews for creator's courses
    const reviews = await prisma.review.findMany({
      where: { courseId: { in: courseIds } },
      select: { rating: true, courseId: true },
    });

    const totalReviews = reviews.length;
    const sumRating = reviews.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = totalReviews > 0 ? Number((sumRating / totalReviews).toFixed(1)) : 0;

    const ratingByCourse: Record<string, { sum: number; count: number }> = {};
    reviews.forEach((r) => {
      if (!ratingByCourse[r.courseId]) {
        ratingByCourse[r.courseId] = { sum: 0, count: 0 };
      }
      ratingByCourse[r.courseId].sum += r.rating;
      ratingByCourse[r.courseId].count += 1;
    });

    // 5. Course breakdown with enrolledStudents roster
    const courseBreakdown = creatorCourses.map((c) => {
      const courseRevenue = revenueByCourse[c.id] || 0;
      const courseEnrolled = enrollmentsByCourse[c.id] || c._count.enrollments;
      const courseRevCount = ratingByCourse[c.id]?.count || c._count.reviews;
      const courseAvgRating =
        courseRevCount > 0
          ? Number(((ratingByCourse[c.id]?.sum || 0) / courseRevCount).toFixed(1))
          : c.averageRating || 0;
      const enrolledStudents = courseEnrollmentsMap[c.id] || [];

      const completedStudentsCount = enrolledStudents.filter((s) => s.status === "Completed").length;
      const completionRate =
        enrolledStudents.length > 0
          ? Math.round((completedStudentsCount / enrolledStudents.length) * 100)
          : 0;

      const lastEnrollmentDate =
        enrolledStudents.length > 0 ? enrolledStudents[0].enrolledAt : null;

      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        thumbnailUrl: c.thumbnailUrl,
        price: c.price,
        discountPrice: c.discountPrice,
        isPublished: c.isPublished,
        categoryName: c.category.name,
        revenue: courseRevenue,
        enrollmentsCount: courseEnrolled,
        reviewsCount: courseRevCount,
        averageRating: courseAvgRating,
        completionRate,
        lessonsCount: c._count.lessons || 0,
        lastEnrollmentDate,
        enrolledStudents,
      };
    });

    // Top performing courses (sorted by revenue descending)
    const topPerformingCourses = [...courseBreakdown]
      .sort((a, b) => b.revenue - a.revenue || b.enrollmentsCount - a.enrollmentsCount)
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        title: c.title,
        revenue: c.revenue,
        enrollmentsCount: c.enrollmentsCount,
        averageRating: c.averageRating,
        thumbnailUrl: c.thumbnailUrl,
      }));

    // 6. Recent Payments (top 10)
    const recentPayments = orderItems.slice(0, 10).map((item) => ({
      id: item.id,
      paymentId: item.order.payment?.razorpayPaymentId || `pay_${item.id.slice(-6)}`,
      amount: item.price,
      status: item.order.status,
      courseTitle: item.course.title,
      studentName: item.order.user.name,
      studentEmail: item.order.user.email,
      createdAt: item.order.payment?.createdAt || item.order.createdAt,
    }));

    // 7. Recent Enrollments (top 10)
    const recentEnrollments = enrollments.slice(0, 10).map((e) => ({
      id: e.id,
      studentName: e.user.name,
      studentEmail: e.user.email,
      studentImage: e.user.profileImage,
      courseTitle: e.course.title,
      enrolledAt: e.createdAt,
    }));

    // 8. Trends & Charts aggregation (last 12 months breakdown)
    const now = new Date();
    const monthlySlots: Array<{
      yearMonthKey: string;
      label: string;
      revenue: number;
      ordersCount: number;
      enrollments: number;
    }> = [];
    const slotMap: Record<string, number> = {};

    // Initialize past 12 months in chronological order
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const yearMonthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("default", { month: "short" });

      slotMap[yearMonthKey] = monthlySlots.length;
      monthlySlots.push({
        yearMonthKey,
        label,
        revenue: 0,
        ordersCount: 0,
        enrollments: 0,
      });
    }

    orderItems.forEach((item) => {
      const itemDate = new Date(item.order.payment?.createdAt || item.order.createdAt);
      const itemKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, "0")}`;
      const slotIdx = slotMap[itemKey];
      if (slotIdx !== undefined) {
        monthlySlots[slotIdx].revenue += item.price;
        monthlySlots[slotIdx].ordersCount += 1;
      }
    });

    enrollments.forEach((e) => {
      const eDate = new Date(e.createdAt);
      const eKey = `${eDate.getFullYear()}-${String(eDate.getMonth() + 1).padStart(2, "0")}`;
      const slotIdx = slotMap[eKey];
      if (slotIdx !== undefined) {
        monthlySlots[slotIdx].enrollments += 1;
      }
    });

    const revenueTrend = monthlySlots.map((s) => ({
      label: s.label,
      revenue: s.revenue,
      ordersCount: s.ordersCount,
    }));

    const enrollmentsTrend = monthlySlots.map((s) => ({
      label: s.label,
      enrollments: s.enrollments,
    }));

    // Popular courses bar chart data
    const popularCourses = [...courseBreakdown]
      .sort((a, b) => b.enrollmentsCount - a.enrollmentsCount)
      .slice(0, 5)
      .map((c) => ({
        title: c.title,
        enrollments: c.enrollmentsCount,
        revenue: c.revenue,
      }));

    // Category distribution
    const categoryCounts: Record<string, number> = {};
    creatorCourses.forEach((c) => {
      categoryCounts[c.category.name] = (categoryCounts[c.category.name] || 0) + 1;
    });

    const categoryDistribution = Object.entries(categoryCounts).map(([categoryName, count]) => ({
      categoryName,
      count,
      percentage: Math.round((count / totalCourses) * 100),
    }));

    return {
      overview: {
        totalCourses,
        publishedCourses,
        draftCourses,
        totalStudentsEnrolled,
        totalRevenue,
        totalReviews,
        averageRating,
      },
      courseBreakdown,
      topPerformingCourses,
      recentPayments,
      recentEnrollments,
      charts: {
        revenueTrend,
        enrollmentsTrend,
        popularCourses,
        categoryDistribution,
      },
    };
  }
}
