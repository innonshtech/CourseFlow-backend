import { prisma } from "@/lib/prisma";
import { deleteCloudinaryFile } from "@/lib/cloudinary";
import { ApiError } from "@/types/api";
import {
  Lesson,
  CreateLessonInput,
  UpdateLessonInput,
  LessonFilterParams,
  PaginatedLessonsResponse,
  ReorderLessonItem,
} from "@/types/lesson";
import { NotificationService } from "@/services/notification.service";

export class LessonService {
  /**
   * Helper: Verifies that the course exists and belongs to the given creator.
   */
  private static async verifyCourseOwnership(creatorId: string, courseId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, creatorId: true },
    });

    if (!course) {
      throw ApiError.notFound("Course not found");
    }

    if (course.creatorId !== creatorId) {
      throw ApiError.forbidden("Only the course owner can manage lessons");
    }

    return course;
  }

  /**
   * List lessons for a course with search, filtering, and pagination.
   */
  static async getCourseLessons(
    creatorId: string,
    courseId: string,
    params: LessonFilterParams = {}
  ): Promise<PaginatedLessonsResponse> {
    await this.verifyCourseOwnership(creatorId, courseId);

    const { search = "", status = "all", isPreview, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      courseId,
    };

    if (status === "published") where.isPublished = true;
    if (status === "draft") where.isPublished = false;
    if (typeof isPreview === "boolean") where.isPreview = isPreview;

    if (search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { description: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const [lessons, total, allCount, publishedCount, draftCount] = await Promise.all([
      prisma.lesson.findMany({
        where,
        orderBy: { order: "asc" },
        skip,
        take: limit,
      }),
      prisma.lesson.count({ where }),
      prisma.lesson.count({ where: { courseId } }),
      prisma.lesson.count({ where: { courseId, isPublished: true } }),
      prisma.lesson.count({ where: { courseId, isPublished: false } }),
    ]);

    return {
      lessons: lessons as unknown as Lesson[],
      total,
      counts: {
        all: allCount,
        published: publishedCount,
        draft: draftCount,
      },
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get a single lesson by ID after verifying course ownership.
   */
  static async getLessonById(creatorId: string, lessonId: string): Promise<Lesson> {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: {
          select: { id: true, creatorId: true },
        },
      },
    });

    if (!lesson) {
      throw ApiError.notFound("Lesson not found");
    }

    if (lesson.course.creatorId !== creatorId) {
      throw ApiError.forbidden("Only the course owner can manage lessons");
    }

    const { course, ...lessonData } = lesson;
    return lessonData as unknown as Lesson;
  }

  /**
   * Create a new lesson for a course. Auto-assigns order if not provided.
   */
  static async createLesson(
    creatorId: string,
    courseId: string,
    input: CreateLessonInput
  ): Promise<Lesson> {
    await this.verifyCourseOwnership(creatorId, courseId);

    let order = input.order;
    if (order === undefined || order === null) {
      const maxOrderLesson = await prisma.lesson.findFirst({
        where: { courseId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      order = (maxOrderLesson?.order || 0) + 1;
    }

    const lesson = await prisma.lesson.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        videoUrl: input.videoUrl,
        pdfUrl: input.pdfUrl ?? null,
        duration: input.duration ?? null,
        order,
        isPreview: input.isPreview ?? false,
        isPublished: input.isPublished ?? false,
        courseId,
      },
    });

    // Update totalLessons on parent course
    const count = await prisma.lesson.count({ where: { courseId } });
    await prisma.course.update({
      where: { id: courseId },
      data: { totalLessons: count },
    });

    if (lesson.isPublished) {
      NotificationService.notifyEnrolledStudents(
        courseId,
        "New Lesson Added",
        `A new lesson '${lesson.title}' was added to your enrolled course.`,
        "NEW_LESSON",
        "/student/my-learning"
      );
    }

    return lesson as unknown as Lesson;
  }

  /**
   * Update lesson details.
   */
  static async updateLesson(
    creatorId: string,
    lessonId: string,
    input: UpdateLessonInput
  ): Promise<Lesson> {
    const existing = await this.getLessonById(creatorId, lessonId);

    // If PDF is being replaced or removed, delete old PDF from Cloudinary
    if (
      input.pdfUrl !== undefined &&
      existing.pdfUrl &&
      existing.pdfUrl !== input.pdfUrl
    ) {
      await deleteCloudinaryFile(existing.pdfUrl);
    }

    const updated = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.videoUrl !== undefined && { videoUrl: input.videoUrl }),
        ...(input.pdfUrl !== undefined && { pdfUrl: input.pdfUrl }),
        ...(input.duration !== undefined && { duration: input.duration }),
        ...(input.order !== undefined && input.order !== null && { order: input.order }),
        ...(input.isPreview !== undefined && { isPreview: input.isPreview }),
        ...(input.isPublished !== undefined && { isPublished: input.isPublished }),
      },
    });

    return updated as unknown as Lesson;
  }

  /**
   * Delete a lesson.
   */
  static async deleteLesson(creatorId: string, lessonId: string): Promise<Lesson> {
    const existing = await this.getLessonById(creatorId, lessonId);

    // If lesson has an attached Cloudinary PDF, remove it from Cloudinary
    if (existing.pdfUrl) {
      await deleteCloudinaryFile(existing.pdfUrl);
    }

    const deleted = await prisma.lesson.delete({
      where: { id: lessonId },
    });

    // Update totalLessons count on parent course
    const count = await prisma.lesson.count({ where: { courseId: existing.courseId } });
    await prisma.course.update({
      where: { id: existing.courseId },
      data: { totalLessons: count },
    });

    return deleted as unknown as Lesson;
  }

  /**
   * Toggle or set publish status for a lesson.
   */
  static async togglePublishLesson(
    creatorId: string,
    lessonId: string,
    publishStatus?: boolean
  ): Promise<Lesson> {
    const existing = await this.getLessonById(creatorId, lessonId);

    const newStatus = publishStatus !== undefined ? publishStatus : !existing.isPublished;

    const updated = await prisma.lesson.update({
      where: { id: lessonId },
      data: { isPublished: newStatus },
    });

    return updated as unknown as Lesson;
  }

  /**
   * Reorder lessons within a course.
   */
  static async reorderLessons(
    creatorId: string,
    courseId: string,
    items: ReorderLessonItem[]
  ): Promise<Lesson[]> {
    await this.verifyCourseOwnership(creatorId, courseId);

    // Run updates in transaction
    const updatePromises = items.map((item) =>
      prisma.lesson.updateMany({
        where: {
          id: item.id,
          courseId,
        },
        data: {
          order: item.order,
        },
      })
    );

    await prisma.$transaction(updatePromises);

    const updatedLessons = await prisma.lesson.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
    });

    return updatedLessons as unknown as Lesson[];
  }
}
