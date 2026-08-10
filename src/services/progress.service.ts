import { prisma } from "@/lib/prisma";
import { ApiError } from "@/types/api";
import {
  CourseProgressDetails,
  EnrolledCourseProgressItem,
  OverallLearningProgress,
  UpdateLessonProgressResult,
} from "@/types/progress";
import { Role } from "@/types/auth";
import { NotificationService } from "@/services/notification.service";

export class ProgressService {
  /**
   * Update or toggle lesson progress for an enrolled student.
   * Automatically updates enrollment's active lastLessonId.
   */
  static async updateLessonProgress(
    userId: string,
    lessonId: string,
    explicitIsCompleted?: boolean
  ): Promise<UpdateLessonProgressResult> {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, courseId: true, isPublished: true },
    });

    if (!lesson || !lesson.isPublished) {
      throw ApiError.notFound("Lesson not found or unavailable");
    }

    // Verify student enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId: lesson.courseId },
      },
    });

    if (!enrollment) {
      throw ApiError.forbidden("Only enrolled students can update learning progress");
    }

    // Check existing progress record
    const existingProgress = await prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: { userId, lessonId },
      },
    });

    const newCompletedStatus =
      explicitIsCompleted !== undefined
        ? explicitIsCompleted
        : !(existingProgress?.isCompleted ?? false);

    // Upsert LessonProgress record
    await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: { userId, lessonId },
      },
      create: {
        userId,
        lessonId,
        isCompleted: newCompletedStatus,
      },
      update: {
        isCompleted: newCompletedStatus,
      },
    });

    // Update active lastLessonId on Enrollment
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { lastLessonId: lessonId },
    });

    // Recalculate progress for this course
    const courseLessons = await prisma.lesson.findMany({
      where: { courseId: lesson.courseId, isPublished: true },
      orderBy: { order: "asc" },
      select: { id: true, order: true },
    });

    const completedRecords = await prisma.lessonProgress.findMany({
      where: {
        userId,
        lesson: { courseId: lesson.courseId },
        isCompleted: true,
      },
      select: { lessonId: true, updatedAt: true },
    });

    const completedLessonIds = new Set(completedRecords.map((r) => r.lessonId));
    const totalLessons = courseLessons.length;
    const completedCount = completedRecords.length;
    const lessonsRemaining = Math.max(0, totalLessons - completedCount);
    const overallProgress =
      totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
    const isCourseCompleted = overallProgress === 100 && totalLessons > 0;

    // Find last incomplete lesson
    const firstIncompleteLesson = courseLessons.find((l) => !completedLessonIds.has(l.id));
    const nextUncompletedLessonId = firstIncompleteLesson
      ? firstIncompleteLesson.id
      : courseLessons[courseLessons.length - 1]?.id || null;

    // Calculate completion date if 100% finished
    let completedAt: Date | null = null;
    if (isCourseCompleted && completedRecords.length > 0) {
      const dates = completedRecords.map((r) => r.updatedAt.getTime());
      completedAt = new Date(Math.max(...dates));

      // Fetch course title for notification message
      const course = await prisma.course.findUnique({
        where: { id: lesson.courseId },
        select: { title: true },
      });

      if (course) {
        NotificationService.createNotification({
          recipientId: userId,
          recipientRole: Role.STUDENT,
          title: "Course completed",
          message: `Congratulations! You have completed all lessons in ${course.title}.`,
          type: "COURSE_COMPLETED",
          link: "/student/my-learning",
        });

        NotificationService.createNotification({
          recipientId: userId,
          recipientRole: Role.STUDENT,
          title: "Certificate available",
          message: `Your certificate of completion for ${course.title} is now available.`,
          type: "CERTIFICATE_AVAILABLE",
          link: "/student/my-learning",
        });
      }
    }

    return {
      lessonId,
      isCompleted: newCompletedStatus,
      completedCount,
      totalLessons,
      lessonsRemaining,
      overallProgress,
      isCourseCompleted,
      completedAt,
      nextUncompletedLessonId,
    };
  }

  /**
   * Get progress breakdown for a specific course for an enrolled student
   */
  static async getCourseProgress(
    userId: string,
    courseId: string
  ): Promise<CourseProgressDetails> {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });

    if (!enrollment) {
      throw ApiError.forbidden("Only enrolled students can view course progress");
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        lessons: {
          where: { isPublished: true },
          orderBy: { order: "asc" },
          select: { id: true, title: true, order: true },
        },
      },
    });

    if (!course) {
      throw ApiError.notFound("Course not found");
    }

    const completedRecords = await prisma.lessonProgress.findMany({
      where: {
        userId,
        lesson: { courseId },
        isCompleted: true,
      },
      select: { lessonId: true, updatedAt: true },
    });

    const completedLessonIds = completedRecords.map((r) => r.lessonId);
    const completedSet = new Set(completedLessonIds);
    const totalLessons = course.lessons.length;
    const completedLessonsCount = completedRecords.length;
    const lessonsRemaining = Math.max(0, totalLessons - completedLessonsCount);
    const overallProgress =
      totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;
    const isCompleted = overallProgress === 100 && totalLessons > 0;

    // First uncompleted lesson
    const firstIncompleteLesson = course.lessons.find((l) => !completedSet.has(l.id));
    const nextUncompletedLessonId = firstIncompleteLesson
      ? firstIncompleteLesson.id
      : enrollment.lastLessonId || course.lessons[0]?.id || null;

    let completedAt: Date | null = null;
    if (isCompleted && completedRecords.length > 0) {
      const dates = completedRecords.map((r) => r.updatedAt.getTime());
      completedAt = new Date(Math.max(...dates));
    }

    return {
      courseId: course.id,
      courseTitle: course.title,
      overallProgress,
      completedLessonsCount,
      totalLessons,
      lessonsRemaining,
      isCompleted,
      completedAt,
      lastLessonId: enrollment.lastLessonId,
      nextUncompletedLessonId,
      completedLessonIds,
    };
  }

  /**
   * Get overall learning progress for an enrolled student across all courses
   */
  static async getOverallProgress(userId: string): Promise<OverallLearningProgress> {
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

    const userProgressRecords = await prisma.lessonProgress.findMany({
      where: { userId },
      include: {
        lesson: { select: { courseId: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const completedMap = new Map<string, Date>();
    const latestActivityMap = new Map<string, number>();

    userProgressRecords.forEach((r) => {
      if (r.isCompleted) {
        completedMap.set(r.lessonId, r.updatedAt);
      }
      const courseId = r.lesson.courseId;
      const time = new Date(r.updatedAt).getTime();
      if (!latestActivityMap.has(courseId) || time > latestActivityMap.get(courseId)!) {
        latestActivityMap.set(courseId, time);
      }
    });

    const formattedItems: (EnrolledCourseProgressItem & { lastActivityTime: number })[] = enrollments.map((item) => {
      const c = item.course;
      const totalLessons = c.lessons.length;
      const lastActivityTime = latestActivityMap.get(c.id) || new Date(item.createdAt).getTime();

      const courseCompletedRecords = c.lessons
        .filter((l) => completedMap.has(l.id))
        .map((l) => ({ lessonId: l.id, updatedAt: completedMap.get(l.id)! }));

      const completedCount = courseCompletedRecords.length;
      const lessonsRemaining = Math.max(0, totalLessons - completedCount);
      const overallProgress =
        totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      const isCompleted = overallProgress === 100 && totalLessons > 0;

      // Find the last incomplete lesson
      const completedSet = new Set(courseCompletedRecords.map((r) => r.lessonId));
      const firstIncompleteLesson = c.lessons.find((l) => !completedSet.has(l.id));

      // Fallback: If all completed or none, use lastLessonId or last lesson
      const activeLesson =
        firstIncompleteLesson ||
        c.lessons.find((l) => l.id === item.lastLessonId) ||
        (c.lessons.length > 0 ? c.lessons[c.lessons.length - 1] : null) ||
        c.lessons[0] ||
        null;

      let completedAt: Date | null = null;
      if (isCompleted && courseCompletedRecords.length > 0) {
        const dates = courseCompletedRecords.map((r) => r.updatedAt.getTime());
        completedAt = new Date(Math.max(...dates));
      }

      return {
        enrollmentId: item.id,
        enrolledAt: item.createdAt,
        lastActivityTime,
        lastLessonId: item.lastLessonId,
        overallProgress,
        completedLessonsCount: completedCount,
        totalLessons,
        lessonsRemaining,
        isCompleted,
        completedAt,
        nextLesson: activeLesson
          ? {
              id: activeLesson.id,
              title: activeLesson.title,
              order: activeLesson.order,
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

    // 1. Sort My Courses / History: In-progress first (0-99%), then Completed (100%)
    // Within each group, order by most recent activity timestamp
    formattedItems.sort((a, b) => {
      const aIsCompleted = a.isCompleted ? 1 : 0;
      const bIsCompleted = b.isCompleted ? 1 : 0;

      if (aIsCompleted !== bIsCompleted) {
        return aIsCompleted - bIsCompleted;
      }

      return b.lastActivityTime - a.lastActivityTime;
    });

    const completedCourses = formattedItems.filter((item) => item.isCompleted);
    const inProgressCourses = formattedItems.filter((item) => !item.isCompleted);

    // 2. Continue Learning: Most recently watched in-progress course
    // If all courses are completed, select the most recently completed course
    const itemsByRecency = [...formattedItems].sort((a, b) => b.lastActivityTime - a.lastActivityTime);

    const continueLearning =
      itemsByRecency.find((item) => !item.isCompleted && item.totalLessons > 0) ||
      itemsByRecency[0] ||
      null;

    return {
      enrolledCoursesCount: formattedItems.length,
      completedCoursesCount: completedCourses.length,
      inProgressCoursesCount: inProgressCourses.length,
      completedCourses,
      inProgressCourses,
      continueLearning,
    };
  }
}
