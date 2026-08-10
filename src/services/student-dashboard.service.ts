import { prisma } from "@/lib/prisma";

export interface StudentDashboardData {
  stats: {
    enrolledCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    wishlistCount: number;
    cartCount: number;
    certificatesCount: number;
  };
  continueLearning: {
    enrollmentId: string;
    courseId: string;
    courseTitle: string;
    courseSlug: string;
    thumbnailUrl: string | null;
    categoryName: string;
    progressPercentage: number;
    completedCount: number;
    totalLessons: number;
    nextLesson: {
      id: string;
      title: string;
      order: number;
    } | null;
  } | null;
  progressOverview: {
    totalCompletedLessons: number;
    totalAvailableLessons: number;
    overallProgressPercentage: number;
    courseProgressList: Array<{
      id: string;
      title: string;
      progressPercentage: number;
      completedCount: number;
      totalLessons: number;
    }>;
  };
  myLearningSummary: Array<{
    id: string;
    title: string;
    slug: string;
    thumbnailUrl: string | null;
    categoryName: string;
    progressPercentage: number;
    lastLessonId: string | null;
  }>;
  wishlistSummary: {
    count: number;
    items: Array<{
      id: string;
      courseId: string;
      title: string;
      price: number;
      discountPrice: number | null;
      thumbnailUrl: string | null;
      categoryName: string;
    }>;
  };
  cartSummary: {
    count: number;
    totalAmount: number;
    items: Array<{
      id: string;
      courseId: string;
      title: string;
      price: number;
      discountPrice: number | null;
      thumbnailUrl: string | null;
    }>;
  };
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    createdAt: string;
    isImportant?: boolean;
  }>;
  discovery: {
    recommendedCourses: any[];
    trendingCourses: any[];
    newCourses: any[];
    categories: any[];
  };
}

export class StudentDashboardService {
  /**
   * Fetches complete aggregated dashboard data for an authenticated student.
   */
  static async getDashboardData(userId: string): Promise<StudentDashboardData> {
    // 1. Fetch Student Enrollments with course & lessons
    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        course: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
            creator: { select: { id: true, name: true, profileImage: true } },
            lessons: {
              where: { isPublished: true },
              orderBy: { order: "asc" },
              select: { id: true, title: true, order: true },
            },
          },
        },
      },
    });

    // Fetch user's lesson progress records to track completion and latest watch activity timestamps
    const userProgressRecords = await prisma.lessonProgress.findMany({
      where: { userId },
      include: {
        lesson: { select: { courseId: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const completedLessonIds = new Set(
      userProgressRecords.filter((r) => r.isCompleted).map((r) => r.lessonId)
    );

    // Map courseId -> latest updatedAt timestamp (ms)
    const latestActivityMap = new Map<string, number>();
    for (const record of userProgressRecords) {
      const courseId = record.lesson.courseId;
      const time = new Date(record.updatedAt).getTime();
      if (!latestActivityMap.has(courseId) || time > latestActivityMap.get(courseId)!) {
        latestActivityMap.set(courseId, time);
      }
    }

    let completedCoursesCount = 0;
    let inProgressCoursesCount = 0;
    let totalCompletedLessons = 0;
    let totalAvailableLessons = 0;

    const formattedEnrollments = enrollments.map((item) => {
      const c = item.course;
      const totalLessons = c.lessons.length;
      const completedCount = c.lessons.filter((l) => completedLessonIds.has(l.id)).length;
      const progressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      const lastActivityTime = latestActivityMap.get(c.id) || new Date(item.createdAt).getTime();

      totalCompletedLessons += completedCount;
      totalAvailableLessons += totalLessons;

      if (progressPercentage === 100 && totalLessons > 0) {
        completedCoursesCount++;
      } else {
        inProgressCoursesCount++;
      }

      // Target lesson calculation for Continue Learning:
      // - Uncompleted progress -> pick first uncompleted lesson
      // - No progress (0%) -> pick first lesson
      // - Completed progress (100%) -> pick last lesson in course
      const firstUncompleted = c.lessons.find((l) => !completedLessonIds.has(l.id));
      const storedLast = item.lastLessonId ? c.lessons.find((l) => l.id === item.lastLessonId) : null;
      const lastLessonInCourse = c.lessons.length > 0 ? c.lessons[c.lessons.length - 1] : null;

      const targetLesson =
        firstUncompleted ||
        storedLast ||
        lastLessonInCourse ||
        c.lessons[0] ||
        null;

      return {
        enrollmentId: item.id,
        courseId: c.id,
        courseTitle: c.title,
        courseSlug: c.slug,
        thumbnailUrl: c.thumbnailUrl,
        categoryName: c.category.name,
        creatorId: c.creator.id,
        creatorName: c.creator.name,
        progressPercentage,
        completedCount,
        totalLessons,
        lastActivityTime,
        lastLessonId: item.lastLessonId,
        nextLesson: targetLesson
          ? {
              id: targetLesson.id,
              title: targetLesson.title,
              order: targetLesson.order,
            }
          : null,
      };
    });

    // 1. Sort My Courses: In-progress first (0-99%), then Completed (100%)
    // Within each group, order by most recent activity timestamp
    formattedEnrollments.sort((a, b) => {
      const aIsCompleted = a.progressPercentage === 100 && a.totalLessons > 0 ? 1 : 0;
      const bIsCompleted = b.progressPercentage === 100 && b.totalLessons > 0 ? 1 : 0;

      if (aIsCompleted !== bIsCompleted) {
        return aIsCompleted - bIsCompleted;
      }

      return b.lastActivityTime - a.lastActivityTime;
    });

    // 2. Continue Learning course selection: Most recently watched in-progress course
    // If all courses are completed, select the most recently completed course
    const itemsByRecency = [...formattedEnrollments].sort((a, b) => b.lastActivityTime - a.lastActivityTime);

    const continueLearningItem =
      itemsByRecency.find((item) => item.progressPercentage < 100 && item.totalLessons > 0) ||
      itemsByRecency[0] ||
      null;

    // Overall Progress calculation
    const overallProgressPercentage =
      totalAvailableLessons > 0 ? Math.round((totalCompletedLessons / totalAvailableLessons) * 100) : 0;

    // 2. Fetch Wishlist Summary
    const wishlist = await prisma.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        course: {
          include: { category: { select: { name: true } } },
        },
      },
      take: 3,
    });
    const wishlistTotalCount = await prisma.wishlist.count({ where: { userId } });

    // 3. Fetch Cart Summary
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            course: true,
          },
        },
      },
    });

    const cartItems = cart?.items || [];
    let cartTotalAmount = 0;
    cartItems.forEach((item) => {
      cartTotalAmount += item.course.discountPrice ?? item.course.price;
    });

    // 4. Fetch Discovery Data (Recommended, Trending, New, Categories)
    const enrolledCourseIds = enrollments.map((e) => e.courseId);

    const [recommendedCourses, trendingCourses, newCourses, categories] = await Promise.all([
      // Recommended courses (excluding already enrolled)
      prisma.course.findMany({
        where: {
          isPublished: true,
          id: { notIn: enrolledCourseIds },
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          creator: { select: { id: true, name: true, profileImage: true } },
        },
        orderBy: { averageRating: "desc" },
        take: 4,
      }),

      // Trending courses
      prisma.course.findMany({
        where: { isPublished: true },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          creator: { select: { id: true, name: true, profileImage: true } },
        },
        orderBy: { totalStudents: "desc" },
        take: 4,
      }),

      // New courses
      prisma.course.findMany({
        where: { isPublished: true },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          creator: { select: { id: true, name: true, profileImage: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),

      // Categories
      prisma.category.findMany({
        where: { isActive: true },
        take: 6,
      }),
    ]);

    // Placeholder Latest Announcements
    const announcements = [
      {
        id: "ann_1",
        title: "🚀 New AI & Web Development Modules Added!",
        content: "Check out fresh lessons added to Next.js App Router & Full Stack masterclasses.",
        category: "Course Update",
        createdAt: new Date().toISOString(),
        isImportant: true,
      },
      {
        id: "ann_2",
        title: "📢 Monthly Student Q&A Webinar Session",
        content: "Join top instructors live this Friday for interactive code reviews and project feedback.",
        category: "Community",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    return {
      stats: {
        enrolledCourses: enrollments.length,
        completedCourses: completedCoursesCount,
        inProgressCourses: inProgressCoursesCount,
        wishlistCount: wishlistTotalCount,
        cartCount: cartItems.length,
        certificatesCount: completedCoursesCount > 0 ? completedCoursesCount : 0,
      },
      continueLearning: continueLearningItem
        ? {
            enrollmentId: continueLearningItem.enrollmentId,
            courseId: continueLearningItem.courseId,
            courseTitle: continueLearningItem.courseTitle,
            courseSlug: continueLearningItem.courseSlug,
            thumbnailUrl: continueLearningItem.thumbnailUrl,
            categoryName: continueLearningItem.categoryName,
            progressPercentage: continueLearningItem.progressPercentage,
            completedCount: continueLearningItem.completedCount,
            totalLessons: continueLearningItem.totalLessons,
            nextLesson: continueLearningItem.nextLesson,
          }
        : null,
      progressOverview: {
        totalCompletedLessons,
        totalAvailableLessons,
        overallProgressPercentage,
        courseProgressList: formattedEnrollments.map((e) => ({
          id: e.courseId,
          title: e.courseTitle,
          progressPercentage: e.progressPercentage,
          completedCount: e.completedCount,
          totalLessons: e.totalLessons,
        })),
      },
      myLearningSummary: formattedEnrollments.slice(0, 6).map((e) => ({
        id: e.courseId,
        title: e.courseTitle,
        slug: e.courseSlug,
        thumbnailUrl: e.thumbnailUrl,
        categoryName: e.categoryName,
        creatorId: e.creatorId,
        creatorName: e.creatorName,
        progressPercentage: e.progressPercentage,
        lastLessonId: e.lastLessonId,
      })),
      wishlistSummary: {
        count: wishlistTotalCount,
        items: wishlist.map((w) => ({
          id: w.id,
          courseId: w.courseId,
          title: w.course.title,
          price: w.course.price,
          discountPrice: w.course.discountPrice,
          thumbnailUrl: w.course.thumbnailUrl,
          categoryName: w.course.category.name,
        })),
      },
      cartSummary: {
        count: cartItems.length,
        totalAmount: cartTotalAmount,
        items: cartItems.slice(0, 3).map((ci) => ({
          id: ci.id,
          courseId: ci.courseId,
          title: ci.course.title,
          price: ci.course.price,
          discountPrice: ci.course.discountPrice,
          thumbnailUrl: ci.course.thumbnailUrl,
        })),
      },
      announcements,
      discovery: {
        recommendedCourses,
        trendingCourses,
        newCourses,
        categories,
      },
    };
  }
}
