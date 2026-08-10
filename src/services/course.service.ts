import { prisma } from "../lib/prisma";
import { ApiError } from "../types/api";
import { deleteCloudinaryFile } from "../lib/cloudinary";
import {
  Course,
  CreateCourseInput,
  UpdateCourseInput,
  CourseFilterParams,
  PaginatedCoursesResponse,
} from "../types/course";
import { slugify } from "../validators/course";
import { Role } from "../types/auth";
import { NotificationService } from "../services/notification.service";

export class CourseService {
  /**
   * Generates a unique slug for a course. If duplicate exists, appends numbers.
   */
  private static async generateUniqueSlug(baseTitle: string, excludeId?: string): Promise<string> {
    let slug = slugify(baseTitle);
    if (!slug) slug = "course-" + Date.now();

    let count = 0;
    let candidate = slug;

    while (true) {
      const existing = await prisma.course.findFirst({
        where: {
          slug: candidate,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
      });

      if (!existing) break;
      count++;
      candidate = `${slug}-${count}`;
    }

    return candidate;
  }

  /**
   * Fetches paginated courses belonging to a specific creator.
   */
  static async getCreatorCourses(
    creatorId: string,
    params: CourseFilterParams = {}
  ): Promise<PaginatedCoursesResponse> {
    const {
      search = "",
      status = "all",
      categoryId,
      level = "all",
      sort = "newest",
      page = 1,
      limit = 10,
    } = params;

    const skip = (page - 1) * limit;

    // Filter by creator ID strictly
    const where: Record<string, unknown> = {
      creatorId,
    };

    if (status === "published") where.isPublished = true;
    if (status === "draft") where.isPublished = false;

    if (categoryId && categoryId !== "all") {
      where.categoryId = categoryId;
    }

    if (level && level !== "all") {
      where.level = level;
    }

    if (search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { description: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    let orderBy: Record<string, "asc" | "desc"> = { createdAt: "desc" };
    if (sort === "oldest") orderBy = { createdAt: "asc" };
    if (sort === "title_asc") orderBy = { title: "asc" };
    if (sort === "title_desc") orderBy = { title: "desc" };
    if (sort === "price_asc") orderBy = { price: "asc" };
    if (sort === "price_desc") orderBy = { price: "desc" };
    if (sort === "popular") orderBy = { totalStudents: "desc" };

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          creator: {
            select: { id: true, name: true, email: true, profileImage: true },
          },
        },
      }),
      prisma.course.count({ where }),
    ]);

    return {
      courses: courses as unknown as Course[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Fetches published courses for Student Course Discovery.
   * STRICT SECURITY: Only returns isPublished = true courses.
   */
  static async getPublishedCourses(
    params: CourseFilterParams = {}
  ): Promise<PaginatedCoursesResponse> {
    const {
      search = "",
      categoryId,
      creatorId,
      level = "all",
      language = "all",
      priceType = "all",
      sort = "newest",
      page = 1,
      limit = 12,
    } = params;

    const skip = (page - 1) * limit;

    // STRICT FILTER: Only published courses
    const where: Record<string, unknown> = {
      isPublished: true,
    };

    if (categoryId && categoryId !== "all") {
      where.OR = [
        { categoryId: categoryId },
        { category: { is: { slug: { equals: categoryId, mode: "insensitive" } } } },
        { category: { is: { name: { equals: categoryId, mode: "insensitive" } } } },
      ];
    }

    if (creatorId && creatorId !== "all") {
      where.creatorId = creatorId;
    }

    if (level && level !== "all") {
      where.level = { equals: level.toUpperCase(), mode: "insensitive" };
    }

    if (language && language !== "all") {
      where.language = { contains: language, mode: "insensitive" };
    }

    if (priceType === "free") {
      where.price = 0;
    } else if (priceType === "paid") {
      where.price = { gt: 0 };
    }

    if (search.trim()) {
      const searchCondition = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { description: { contains: search.trim(), mode: "insensitive" } },
      ];
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchCondition },
        ];
        delete where.OR;
      } else {
        where.OR = searchCondition;
      }
    }

    let orderBy: Record<string, "asc" | "desc"> = { createdAt: "desc" };
    if (sort === "oldest") orderBy = { createdAt: "asc" };
    if (sort === "popular") orderBy = { totalStudents: "desc" };
    if (sort === "rating") orderBy = { averageRating: "desc" };
    if (sort === "title_asc") orderBy = { title: "asc" };
    if (sort === "title_desc") orderBy = { title: "desc" };
    if (sort === "price_asc") orderBy = { price: "asc" };
    if (sort === "price_desc") orderBy = { price: "desc" };

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true,
              bio: true,
            },
          },
        },
      }),
      prisma.course.count({ where }),
    ]);

    return {
      courses: courses as unknown as Course[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Fetches published course details for student view.
   * Includes published lessons, category info, creator profile, and reviews.
   */
  static async getPublishedCourseById(identifier: string, userId?: string) {
    const course = await prisma.course.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
        isPublished: true,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true, description: true, image: true },
        },
        creator: {
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
          },
        },
        lessons: {
          where: {
            isPublished: true,
          },
          orderBy: {
            order: "asc",
          },
          select: {
            id: true,
            title: true,
            description: true,
            videoUrl: true,
            pdfUrl: true,
            duration: true,
            order: true,
            isPreview: true,
            isPublished: true,
          },
        },
        reviews: {
          include: {
            user: {
              select: { id: true, name: true, profileImage: true },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
      },
    });

    if (!course) {
      throw ApiError.notFound("Course not found or not published");
    }

    let isEnrolled = false;
    if (userId) {
      if (course.creatorId === userId) {
        isEnrolled = true;
      } else {
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId,
              courseId: course.id,
            },
          },
        });
        if (enrollment) {
          isEnrolled = true;
        }
      }
    }

    let creatorTotalCourses = 0;
    let creatorRating: number | undefined = undefined;

    if (course.creatorId) {
      const [coursesCount, avgRatingAgg] = await Promise.all([
        prisma.course.count({
          where: { creatorId: course.creatorId, isPublished: true },
        }),
        prisma.course.aggregate({
          where: { creatorId: course.creatorId, isPublished: true, averageRating: { gt: 0 } },
          _avg: { averageRating: true },
        }),
      ]);

      creatorTotalCourses = coursesCount;
      if (avgRatingAgg._avg.averageRating) {
        creatorRating = Number(avgRatingAgg._avg.averageRating.toFixed(1));
      }
    }

    const formattedCreator = course.creator
      ? {
          ...course.creator,
          totalCourses: creatorTotalCourses,
          rating: creatorRating,
        }
      : null;

    return {
      ...course,
      creator: formattedCreator,
      isEnrolled,
    };
  }

  /**
   * Fetches a single course by ID belonging to creator.
   */
  static async getCourseById(creatorId: string, id: string): Promise<Course> {
    const course = await prisma.course.findFirst({
      where: {
        id,
        creatorId,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        creator: {
          select: { id: true, name: true, email: true, profileImage: true },
        },
      },
    });

    if (!course) {
      throw ApiError.notFound("Course not found or access denied");
    }

    return course as unknown as Course;
  }

  /**
   * Creates a new course.
   */
  static async createCourse(creatorId: string, input: CreateCourseInput): Promise<Course> {
    const slug = input.slug
      ? await this.generateUniqueSlug(input.slug)
      : await this.generateUniqueSlug(input.title);

    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
    });
    if (!category) {
      throw ApiError.badRequest("Selected category does not exist");
    }

    const course = await prisma.course.create({
      data: {
        title: input.title,
        slug,
        description: input.description,
        thumbnailUrl: input.thumbnailUrl || null,
        price: input.price,
        discountPrice: input.discountPrice ?? null,
        level: input.level,
        language: input.language,
        duration: input.duration,
        isFreePreview: input.isFreePreview ?? false,
        isPublished: input.isPublished ?? false,
        creatorId,
        categoryId: input.categoryId,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        creator: {
          select: { id: true, name: true, email: true, profileImage: true },
        },
      },
    });

    if (course.isPublished) {
      NotificationService.createNotification({
        recipientId: creatorId,
        recipientRole: Role.CREATOR,
        title: "Course Published",
        message: `Your course '${course.title}' has been published directly to the platform catalog.`,
        type: "COURSE_PUBLISHED",
        link: `/creator/courses/${course.id}`,
      }).catch(() => {});
    } else {
      NotificationService.createNotification({
        recipientId: creatorId,
        recipientRole: Role.CREATOR,
        title: "Course Saved as Draft",
        message: `Your course '${course.title}' has been saved as a draft under My Courses.`,
        type: "COURSE_CREATED",
        link: `/creator/courses/${course.id}`,
      }).catch(() => {});
    }

    return course as unknown as Course;
  }

  /**
   * Updates an existing course.
   */
  static async updateCourse(
    creatorId: string,
    id: string,
    input: UpdateCourseInput
  ): Promise<Course> {
    const existing = await this.getCourseById(creatorId, id);

    let slug: string | undefined;
    if (input.slug) {
      slug = await this.generateUniqueSlug(input.slug, id);
    } else if (input.title) {
      slug = await this.generateUniqueSlug(input.title, id);
    }

    if (input.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: input.categoryId },
      });
      if (!category) {
        throw ApiError.badRequest("Selected category does not exist");
      }
    }

    // Delete previous Cloudinary thumbnail if thumbnail is replaced
    if (
      input.thumbnailUrl !== undefined &&
      existing.thumbnailUrl &&
      existing.thumbnailUrl !== input.thumbnailUrl
    ) {
      deleteCloudinaryFile(existing.thumbnailUrl).catch(() => {});
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(slug !== undefined && { slug }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.thumbnailUrl !== undefined && { thumbnailUrl: input.thumbnailUrl }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.discountPrice !== undefined && { discountPrice: input.discountPrice }),
        ...(input.level !== undefined && { level: input.level }),
        ...(input.language !== undefined && { language: input.language }),
        ...(input.duration !== undefined && { duration: input.duration }),
        ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
        ...(input.isFreePreview !== undefined && { isFreePreview: input.isFreePreview }),
        ...(input.isPublished !== undefined && { isPublished: input.isPublished }),
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        creator: {
          select: { id: true, name: true, email: true, profileImage: true },
        },
      },
    });

    return updated as unknown as Course;
  }

  /**
   * Deletes a course.
   */
  static async deleteCourse(creatorId: string, id: string): Promise<Course> {
    const existing = await this.getCourseById(creatorId, id);

    // Delete thumbnail from Cloudinary
    if (existing.thumbnailUrl) {
      deleteCloudinaryFile(existing.thumbnailUrl).catch(() => {});
    }

    const deleted = await prisma.course.delete({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        creator: {
          select: { id: true, name: true, email: true, profileImage: true },
        },
      },
    });

    return deleted as unknown as Course;
  }

  /**
   * Toggles published status of a course.
   */
  static async togglePublishCourse(creatorId: string, id: string): Promise<Course> {
    const existing = await this.getCourseById(creatorId, id);

    const updated = await prisma.course.update({
      where: { id },
      data: {
        isPublished: !existing.isPublished,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        creator: {
          select: { id: true, name: true, email: true, profileImage: true },
        },
      },
    });

    return updated as unknown as Course;
  }

  /**
   * Duplicates an existing course (creates a copy with draft status).
   */
  static async duplicateCourse(creatorId: string, id: string): Promise<Course> {
    const original = await this.getCourseById(creatorId, id);

    const newTitle = `${original.title} (Copy)`;
    const newSlug = await this.generateUniqueSlug(newTitle);

    const copy = await prisma.course.create({
      data: {
        title: newTitle,
        slug: newSlug,
        description: original.description,
        thumbnailUrl: original.thumbnailUrl,
        price: original.price,
        discountPrice: original.discountPrice,
        level: original.level,
        language: original.language,
        duration: original.duration,
        isFreePreview: original.isFreePreview,
        isPublished: false,
        creatorId,
        categoryId: original.categoryId,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        creator: {
          select: { id: true, name: true, email: true, profileImage: true },
        },
      },
    });

    return copy as unknown as Course;
  }
}
