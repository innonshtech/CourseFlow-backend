import { prisma } from "@/lib/prisma";
import { ApiError } from "@/types/api";

export class LearningService {
  /**
   * Fetch enrolled courses with progress for My Learning dashboard
   */
  static async getMyLearning(userId: string) {
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
              select: { id: true, title: true, duration: true, order: true },
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

    const formattedItems = enrollments.map((item) => {
      const c = item.course;
      const totalLessons = c.lessons.length;
      
      const completedCount = c.lessons.filter((l) => completedLessonIds.has(l.id)).length;
      const progressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      const lastActivityTime = latestActivityMap.get(c.id) || new Date(item.createdAt).getTime();

      // Next lesson calculation:
      // - Uncompleted progress -> pick first uncompleted lesson (or stored last lesson)
      // - No progress (0%) -> pick first lesson
      // - Completed progress (100%) -> pick last accessed lesson or last lesson in course
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
        enrolledAt: item.createdAt,
        lastActivityTime,
        lastLessonId: item.lastLessonId,
        progressPercentage,
        completedLessonsCount: completedCount,
        totalLessons,
        nextLesson: targetLesson
          ? {
              id: targetLesson.id,
              title: targetLesson.title,
              order: targetLesson.order,
            }
          : null,
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
          duration: c.duration,
          averageRating: c.averageRating,
          totalStudents: c.totalStudents,
          category: c.category,
          creator: c.creator,
        },
      };
    });

    // 1. Sort My Courses: In-progress first (0-99%), then Completed (100%)
    // Within each group, order by most recent activity timestamp
    formattedItems.sort((a, b) => {
      const aIsCompleted = a.progressPercentage === 100 && a.totalLessons > 0 ? 1 : 0;
      const bIsCompleted = b.progressPercentage === 100 && b.totalLessons > 0 ? 1 : 0;

      if (aIsCompleted !== bIsCompleted) {
        return aIsCompleted - bIsCompleted;
      }

      return b.lastActivityTime - a.lastActivityTime;
    });

    // 2. Continue Learning: Most recently watched in-progress course
    // If all courses are completed, select the most recently completed course
    const itemsByRecency = [...formattedItems].sort((a, b) => b.lastActivityTime - a.lastActivityTime);

    const continueLearning =
      itemsByRecency.find((item) => item.progressPercentage < 100 && item.totalLessons > 0) ||
      itemsByRecency[0] ||
      null;

    const completedCourses = formattedItems.filter((item) => item.progressPercentage === 100 && item.totalLessons > 0);
    const inProgressCourses = formattedItems.filter((item) => item.progressPercentage < 100);

    return {
      items: formattedItems,
      count: formattedItems.length,
      continueLearning,
      completedCourses,
      inProgressCourses,
    };
  }

  /**
   * Get learning details and lesson list for a specific course
   */
  static async getCourseLearningDetails(userId: string | null, courseId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        creator: { select: { id: true, name: true, profileImage: true, bio: true } },
        lessons: {
          where: { isPublished: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!course || !course.isPublished) {
      throw ApiError.notFound("Course not found or not published");
    }

    let isEnrolled = false;
    let lastLessonId: string | null = null;
    let completedLessonIds: string[] = [];

    if (userId) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: { userId, courseId },
        },
      });

      if (enrollment) {
        isEnrolled = true;
        lastLessonId = enrollment.lastLessonId;

        const progressRecords = await prisma.lessonProgress.findMany({
          where: {
            userId,
            lesson: { courseId },
            isCompleted: true,
          },
          select: { lessonId: true },
        });
        completedLessonIds = progressRecords.map((r) => r.lessonId);
      }
    }

    const totalLessons = course.lessons.length;
    const completedCount = completedLessonIds.length;
    const progressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    const isCreator = userId ? course.creatorId === userId : false;

    // Sanitize lesson list for non-enrolled users
    const sanitizedLessons = course.lessons.map((lesson) => {
      const hasAccess = isEnrolled || isCreator || lesson.isPreview;
      return {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        duration: lesson.duration,
        order: lesson.order,
        isPreview: lesson.isPreview,
        isPublished: lesson.isPublished,
        hasAccess,
        videoUrl: hasAccess ? lesson.videoUrl : "",
        pdfUrl: hasAccess ? lesson.pdfUrl : null,
      };
    });

    return {
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        price: course.price,
        discountPrice: course.discountPrice,
        thumbnailUrl: course.thumbnailUrl,
        level: course.level,
        language: course.language,
        duration: course.duration,
        averageRating: course.averageRating,
        totalStudents: course.totalStudents,
        category: course.category,
        creator: course.creator,
      },
      lessons: sanitizedLessons,
      isEnrolled: isEnrolled || isCreator,
      lastLessonId,
      completedLessonIds,
      progressPercentage,
      totalLessons,
    };
  }

  /**
   * Get authorized single lesson with navigation (Next / Previous)
   */
  static async getLesson(userId: string | null, lessonId: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: {
          include: {
            creator: { select: { id: true, name: true, profileImage: true } },
            lessons: {
              where: { isPublished: true },
              orderBy: { order: "asc" },
              select: { id: true, title: true, order: true, isPreview: true },
            },
          },
        },
      },
    });

    if (!lesson || !lesson.isPublished) {
      throw ApiError.notFound("Lesson not found or unavailable");
    }

    let isEnrolled = false;
    const isCreator = userId ? lesson.course.creatorId === userId : false;

    if (userId) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: lesson.courseId,
          },
        },
      });
      if (enrollment) {
        isEnrolled = true;
        // Update last active lesson on enrollment
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { lastLessonId: lesson.id },
        });
      }
    }

    // Access authorization check (Enrolled students, Creators, or Free Previews)
    if (!isEnrolled && !isCreator && !lesson.isPreview) {
      throw ApiError.forbidden("You must be enrolled in this course to access this paid lesson");
    }

    // Calculate Previous / Next lessons
    const courseLessons = lesson.course.lessons;
    const currentIndex = courseLessons.findIndex((l) => l.id === lesson.id);
    const prevLesson = currentIndex > 0 ? courseLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex < courseLessons.length - 1 ? courseLessons[currentIndex + 1] : null;

    // Check completion status if user logged in
    let isCompleted = false;
    if (userId) {
      const progressRecord = await prisma.lessonProgress.findUnique({
        where: {
          userId_lessonId: { userId, lessonId },
        },
      });
      isCompleted = progressRecord?.isCompleted ?? false;
    }

    return {
      lesson: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        videoUrl: lesson.videoUrl,
        pdfUrl: lesson.pdfUrl,
        duration: lesson.duration,
        order: lesson.order,
        isPreview: lesson.isPreview,
        courseId: lesson.courseId,
        createdAt: lesson.createdAt,
      },
      course: {
        id: lesson.course.id,
        title: lesson.course.title,
        slug: lesson.course.slug,
        creator: lesson.course.creator,
      },
      isEnrolled,
      isCompleted,
      prevLessonId: prevLesson ? prevLesson.id : null,
      nextLessonId: nextLesson ? nextLesson.id : null,
    };
  }

  /**
   * Toggle lesson completion progress for student
   */
  static async toggleLessonProgress(userId: string, lessonId: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, courseId: true },
    });

    if (!lesson) {
      throw ApiError.notFound("Lesson not found");
    }

    // Verify enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId: lesson.courseId },
      },
    });

    if (!enrollment) {
      throw ApiError.forbidden("Only enrolled students can mark lessons as complete");
    }

    const existingProgress = await prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: { userId, lessonId },
      },
    });

    const newCompletedStatus = !(existingProgress?.isCompleted ?? false);

    await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: { userId, lessonId },
      },
      create: {
        userId,
        lessonId,
        isCompleted: true,
      },
      update: {
        isCompleted: newCompletedStatus,
      },
    });

    // Recalculate progress % for course
    const totalLessons = await prisma.lesson.count({
      where: { courseId: lesson.courseId, isPublished: true },
    });

    const completedCount = await prisma.lessonProgress.count({
      where: {
        userId,
        lesson: { courseId: lesson.courseId },
        isCompleted: true,
      },
    });

    const progressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    return {
      lessonId,
      isCompleted: newCompletedStatus,
      completedCount,
      totalLessons,
      progressPercentage,
    };
  }
}
