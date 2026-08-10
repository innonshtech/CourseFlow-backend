import { prisma } from "@/lib/prisma";
import { Role, CreatorVerificationStatus } from "@/types/auth";
import { ApiError } from "@/types/api";
import { NotificationService } from "@/services/notification.service";

export interface AdminPlatformOverview {
  stats: {
    totalUsers: number;
    totalStudents: number;
    totalCreators: number;
    totalCourses: number;
    publishedCourses: number;
    totalEnrollments: number;
    totalRevenue: number;
    averageRating: number;
  };
  platformHealth: {
    pendingCreatorApprovals: number;
    pendingCourseApprovals: number;
    rejectedCourses: number;
    suspendedCreators: number;
    supportTickets: number;
    communityPosts: number;
  };
  revenueSummary: Array<{
    label: string;
    revenue: number;
    ordersCount: number;
  }>;
  userStatistics: {
    studentsCount: number;
    creatorsCount: number;
    adminsCount: number;
  };
  topCategories: Array<{
    id: string;
    name: string;
    coursesCount: number;
    enrollmentsCount: number;
  }>;
  topCourses: Array<{
    id: string;
    title: string;
    creatorName: string;
    totalStudents: number;
    revenue: number;
    averageRating: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: "REGISTRATION" | "ENROLLMENT" | "COURSE_PUBLISHED";
    title: string;
    subtitle: string;
    createdAt: Date;
  }>;
}

export class AdminDashboardService {
  /**
   * Platform Analytics & Overview for Admin Dashboard.
   */
  static async getPlatformOverview(): Promise<AdminPlatformOverview> {
    const [
      totalStudents,
      totalCreators,
      adminsCount,
      totalCourses,
      publishedCourses,
      totalEnrollments,
      orders,
      categories,
      courses,
      recentUsers,
      recentEnrollmentsData,
      pendingCreatorApprovals,
      suspendedCreators,
      communityPostsCount,
      ratingAggregate,
    ] = await Promise.all([
      prisma.user.count({ where: { role: Role.STUDENT } }),
      prisma.user.count({ where: { role: Role.CREATOR } }),
      prisma.user.count({ where: { role: Role.ADMIN } }),
      prisma.course.count(),
      prisma.course.count({ where: { isPublished: true } }),
      prisma.enrollment.count(),
      prisma.order.findMany({
        where: { status: "SUCCESS" },
        select: { totalAmount: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.category.findMany({
        include: {
          courses: {
            select: {
              _count: { select: { enrollments: true } },
            },
          },
        },
      }),
      prisma.course.findMany({
        include: {
          creator: { select: { name: true } },
          _count: { select: { enrollments: true } },
        },
        orderBy: { totalStudents: "desc" },
        take: 5,
      }),
      prisma.user.findMany({
        where: { role: { in: [Role.STUDENT, Role.CREATOR] } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, role: true, createdAt: true },
      }),
      prisma.enrollment.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          user: { select: { name: true } },
          course: { select: { title: true } },
        },
      }),
      prisma.user.count({ where: { role: Role.CREATOR, verificationStatus: CreatorVerificationStatus.PENDING } }),
      prisma.user.count({ where: { role: Role.CREATOR, verificationStatus: CreatorVerificationStatus.SUSPENDED } }),
      prisma.communityPost.count(),
      prisma.review.aggregate({ _avg: { rating: true } }),
    ]);

    // Total Users formula: strictly Total Students + Total Creators (excluding Admin accounts)
    const totalUsers = totalStudents + totalCreators;

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Revenue trend last 6 periods
    const daysMap: Record<string, { revenue: number; ordersCount: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 5);
      const label = d.toLocaleDateString("default", { month: "short", day: "numeric" });
      daysMap[label] = { revenue: 0, ordersCount: 0 };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    orders.forEach((o) => {
      if (o.createdAt >= thirtyDaysAgo) {
        const label = o.createdAt.toLocaleDateString("default", { month: "short", day: "numeric" });
        if (!daysMap[label]) daysMap[label] = { revenue: 0, ordersCount: 0 };
        daysMap[label].revenue += o.totalAmount;
        daysMap[label].ordersCount += 1;
      }
    });

    const revenueSummary = Object.entries(daysMap).map(([label, data]) => ({
      label,
      revenue: data.revenue,
      ordersCount: data.ordersCount,
    }));

    // Top categories
    const topCategories = categories
      .map((cat) => {
        const totalCatEnrollments = cat.courses.reduce((sum, c) => sum + c._count.enrollments, 0);
        return {
          id: cat.id,
          name: cat.name,
          coursesCount: cat.courses.length,
          enrollmentsCount: totalCatEnrollments,
        };
      })
      .sort((a, b) => b.enrollmentsCount - a.enrollmentsCount)
      .slice(0, 5);

    // Top courses
    const topCourses = courses.map((c) => ({
      id: c.id,
      title: c.title,
      creatorName: c.creator.name,
      totalStudents: c.totalStudents || c._count.enrollments,
      revenue: (c.discountPrice ?? c.price) * (c.totalStudents || c._count.enrollments),
      averageRating: c.averageRating,
    }));

    // Recent Activity feed
    const recentActivity: Array<{
      id: string;
      type: "REGISTRATION" | "ENROLLMENT" | "COURSE_PUBLISHED";
      title: string;
      subtitle: string;
      createdAt: Date;
    }> = [
      ...recentUsers.map((u) => ({
        id: `u_${u.id}`,
        type: "REGISTRATION" as const,
        title: `New ${u.role} Registration`,
        subtitle: `${u.name} created an account`,
        createdAt: u.createdAt,
      })),
      ...recentEnrollmentsData.map((e) => ({
        id: `e_${e.id}`,
        type: "ENROLLMENT" as const,
        title: "Course Enrollment",
        subtitle: `${e.user.name} enrolled in "${e.course.title}"`,
        createdAt: e.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 8);

    const averageRating = ratingAggregate._avg.rating ? Number(ratingAggregate._avg.rating.toFixed(1)) : 4.8;

    return {
      stats: {
        totalUsers,
        totalStudents,
        totalCreators,
        totalCourses,
        publishedCourses,
        totalEnrollments,
        totalRevenue,
        averageRating,
      },
      platformHealth: {
        pendingCreatorApprovals,
        pendingCourseApprovals: 0,
        rejectedCourses: 0,
        suspendedCreators,
        supportTickets: 0,
        communityPosts: communityPostsCount,
      },
      revenueSummary,
      userStatistics: {
        studentsCount: totalStudents,
        creatorsCount: totalCreators,
        adminsCount,
      },
      topCategories,
      topCourses,
      recentActivity,
    };
  }

  /**
   * User Management: List, Search, Filter Users
   */
  static async getUsers(params: { role?: string; search?: string; page?: number; limit?: number }) {
    const { role, search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (role && role !== "ALL") {
      where.role = role;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          profileImage: true,
          createdAt: true,
          _count: {
            select: {
              enrollments: true,
              createdCourses: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * User Management: Suspend / Activate Account
   */
  static async updateUserRoleOrStatus(userId: string, data: { role?: Role }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.role ? { role: data.role } : {}),
      },
    });

    return updated;
  }

  /**
   * Course Management: View All Courses, Search, Filter, Publish/Unpublish, Delete
   * STRICT SECURITY: Only shows published/submitted courses to Admin. Excludes draft courses.
   */
  static async getAdminCourses(params: {
    status?: string;
    categoryId?: string;
    search?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, categoryId, search, sort = "latest", page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filter status
    if (status === "PUBLISHED") {
      where.isPublished = true;
    } else if (status === "PENDING") {
      where.isPublished = false;
      where.lessons = { some: {} };
    } else {
      // "ALL": Include all eligible non-draft courses (Published OR Submitted/Pending with lessons)
      where.OR = [{ isPublished: true }, { lessons: { some: {} } }];
    }

    if (categoryId && categoryId !== "ALL") {
      where.categoryId = categoryId;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.AND = [
        {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { creator: { name: { contains: q, mode: "insensitive" } } },
            { creator: { email: { contains: q, mode: "insensitive" } } },
          ],
        },
      ];
    }

    let orderBy: any = { createdAt: "desc" };
    if (sort === "oldest") orderBy = { createdAt: "asc" };
    if (sort === "rating") orderBy = { averageRating: "desc" };
    if (sort === "students") orderBy = { totalStudents: "desc" };

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          creator: { select: { id: true, name: true, email: true, profileImage: true, displayName: true } },
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { enrollments: true, lessons: true, reviews: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.course.count({ where }),
    ]);

    const mappedCourses = courses.map((c) => {
      const enrolledStudentsCount = Math.max(c.totalStudents || 0, c._count?.enrollments || 0);
      return {
        ...c,
        totalStudents: enrolledStudentsCount,
        enrolledStudentsCount,
        totalReviews: c._count?.reviews || 0,
        totalLessons: c.totalLessons || c._count?.lessons || 0,
      };
    });

    return { courses: mappedCourses, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  }

  /**
   * Admin Read-Only Course Inspection Mode: Fetch complete course details, lessons list, video URLs, and reviews
   */
  static async getAdminCourseDetails(courseId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
            bio: true,
            phone: true,
          },
        },
        category: { select: { id: true, name: true, slug: true } },
        lessons: {
          orderBy: { order: "asc" },
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
            createdAt: true,
          },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 15,
          include: {
            user: { select: { name: true, profileImage: true } },
          },
        },
        _count: { select: { enrollments: true, lessons: true, reviews: true } },
      },
    });

    if (!course) {
      throw ApiError.notFound("Course not found");
    }

    const enrolledStudentsCount = Math.max(course.totalStudents || 0, course._count?.enrollments || 0);

    return {
      ...course,
      totalStudents: enrolledStudentsCount,
      enrolledStudentsCount,
      totalReviews: course._count?.reviews || 0,
      totalLessons: course.totalLessons || course.lessons.length,
    };
  }

  /**
   * Creator Verification & Management for Admin: List all creator accounts with aggregated stats & sorting
   */
  static async getAdminCreators(params?: { search?: string; status?: string; sort?: string }) {
    // STRICT FILTERING: Return ONLY users with role = Role.CREATOR. Exclude Students and Admins.
    const where: any = {
      role: Role.CREATOR,
    };

    if (params?.status && params.status !== "ALL") {
      where.verificationStatus = params.status;
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
      ];
    }

    const sortOption = params?.sort || "newest";
    let orderBy: any = { createdAt: "desc" };
    if (sortOption === "oldest") orderBy = { createdAt: "asc" };

    const creators = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        bio: true,
        profileImage: true,
        phone: true,
        creatorDescription: true,
        displayName: true,
        verificationStatus: true,
        approvedAt: true,
        approvedBy: true,
        rejectionReason: true,
        createdAt: true,
        _count: {
          select: {
            createdCourses: true,
          },
        },
      },
      orderBy,
    });

    const creatorsWithStats = await Promise.all(
      creators.map(async (c) => {
        const courses = await prisma.course.findMany({
          where: { creatorId: c.id },
          select: {
            averageRating: true,
            totalStudents: true,
            _count: { select: { reviews: true, enrollments: true } },
          },
        });

        const totalCourses = c._count?.createdCourses || courses.length;
        const totalReviews = courses.reduce((acc, curr) => acc + (curr._count?.reviews || 0), 0);
        const totalStudents = courses.reduce(
          (acc, curr) => acc + Math.max(curr.totalStudents || 0, curr._count?.enrollments || 0),
          0
        );
        const ratingsList = courses.filter((cr) => cr.averageRating > 0).map((cr) => cr.averageRating);
        const averageRating =
          ratingsList.length > 0
            ? ratingsList.reduce((a, b) => a + b, 0) / ratingsList.length
            : 0;

        return {
          ...c,
          totalCourses,
          totalReviews,
          totalStudents,
          averageRating: Number(averageRating.toFixed(1)),
        };
      })
    );

    if (sortOption === "most_courses") {
      creatorsWithStats.sort((a, b) => b.totalCourses - a.totalCourses);
    } else if (sortOption === "highest_rated") {
      creatorsWithStats.sort((a, b) => b.averageRating - a.averageRating);
    }

    // Global Database Status Counts (Role.CREATOR) for invariant filter tab counters
    const [totalCount, approvedCount, pendingCount, rejectedCount, suspendedCount] = await Promise.all([
      prisma.user.count({ where: { role: Role.CREATOR } }),
      prisma.user.count({ where: { role: Role.CREATOR, verificationStatus: CreatorVerificationStatus.APPROVED } }),
      prisma.user.count({
        where: {
          role: Role.CREATOR,
          OR: [{ verificationStatus: CreatorVerificationStatus.PENDING }, { verificationStatus: null }],
        },
      }),
      prisma.user.count({ where: { role: Role.CREATOR, verificationStatus: CreatorVerificationStatus.REJECTED } }),
      prisma.user.count({ where: { role: Role.CREATOR, verificationStatus: CreatorVerificationStatus.SUSPENDED } }),
    ]);

    return {
      creators: creatorsWithStats,
      counts: {
        total: totalCount,
        approved: approvedCount,
        pending: pendingCount,
        rejected: rejectedCount,
        suspended: suspendedCount,
      },
    };
  }

  static async updateCreatorVerificationStatus(
    creatorId: string,
    status: CreatorVerificationStatus,
    rejectionReason?: string,
    adminId?: string
  ) {
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
    });

    if (!creator) {
      throw ApiError.notFound("Creator account not found");
    }

    const updated = await prisma.user.update({
      where: { id: creatorId },
      data: {
        verificationStatus: status,
        ...(status === CreatorVerificationStatus.APPROVED
          ? { approvedAt: new Date(), approvedBy: adminId || null, rejectionReason: null }
          : {}),
        ...(status === CreatorVerificationStatus.REJECTED
          ? { rejectionReason: rejectionReason || "Verification application rejected." }
          : {}),
      },
    });

    NotificationService.createNotification({
      recipientId: creatorId,
      recipientRole: Role.CREATOR,
      title: `Creator Verification: ${status}`,
      message:
        status === CreatorVerificationStatus.APPROVED
          ? "Congratulations! Your creator account has been verified and approved."
          : status === CreatorVerificationStatus.REJECTED
          ? `Your creator application was rejected: ${rejectionReason || "Please update profile details."}`
          : `Your creator verification status was updated to ${status}.`,
      type: "CREATOR_VERIFICATION",
      link: "/creator/profile",
    });

    return updated;
  }

  static async toggleCoursePublish(courseId: string, isPublished: boolean) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw ApiError.notFound("Course not found");

    const updated = await prisma.course.update({
      where: { id: courseId },
      data: { isPublished },
    });

    if (course.creatorId) {
      NotificationService.createNotification({
        recipientId: course.creatorId,
        recipientRole: Role.CREATOR,
        title: isPublished ? "Course approved" : "Course rejected",
        message: isPublished
          ? `Great news! Your course '${course.title}' has been approved and published.`
          : `Your course '${course.title}' review update: course was set to draft or rejected.`,
        type: isPublished ? "COURSE_APPROVED" : "COURSE_REJECTED",
        link: "/creator/courses",
      });
    }

    return updated;
  }

  static async deleteAdminCourse(courseId: string) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw ApiError.notFound("Course not found");

    return prisma.course.delete({
      where: { id: courseId },
    });
  }

  /**
   * Category Management: Full CRUD & Unique Name Validation
   */
  static async getAdminCategories(search?: string) {
    const where: any = {};
    if (search && search.trim()) {
      where.name = { contains: search.trim(), mode: "insensitive" };
    }

    return prisma.category.findMany({
      where,
      include: {
        _count: { select: { courses: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  static async createCategory(data: { name: string; description?: string; icon?: string }) {
    const name = data.name.trim();
    if (!name) throw ApiError.badRequest("Category name is required");

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

    // Prevent duplicate categories
    const existing = await prisma.category.findFirst({
      where: {
        OR: [{ name: { equals: name, mode: "insensitive" } }, { slug }],
      },
    });

    if (existing) {
      throw ApiError.badRequest(`Category "${name}" already exists.`);
    }

    return prisma.category.create({
      data: {
        name,
        slug,
        description: data.description,
        isActive: true,
      },
    });
  }

  static async updateCategory(id: string, data: { name?: string; description?: string; icon?: string; isActive?: boolean }) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw ApiError.notFound("Category not found");

    const updateData: any = {};
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (data.name && data.name.trim() !== category.name) {
      const name = data.name.trim();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

      const existing = await prisma.category.findFirst({
        where: {
          id: { not: id },
          OR: [{ name: { equals: name, mode: "insensitive" } }, { slug }],
        },
      });

      if (existing) {
        throw ApiError.badRequest(`Category "${name}" already exists.`);
      }

      updateData.name = name;
      updateData.slug = slug;
    }

    return prisma.category.update({
      where: { id },
      data: updateData,
    });
  }

  static async deleteCategory(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { courses: true } } },
    });
    if (!category) throw ApiError.notFound("Category not found");

    if (category._count.courses > 0) {
      // Soft delete / deactivate if courses exist
      return prisma.category.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return prisma.category.delete({ where: { id } });
  }

  /**
   * Payment History Management
   */
  static async getPayments(params: { status?: string; search?: string; page?: number; limit?: number }) {
    const { status, search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== "ALL") where.status = status;

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { id: { contains: q, mode: "insensitive" } },
        { razorpayOrderId: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          items: {
            include: {
              course: { select: { title: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Coupon Management: Full CRUD & Activate/Deactivate
   */
  static async getCoupons() {
    return prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  static async createCoupon(data: {
    code: string;
    discount: number;
    isPercentage?: boolean;
    maxUses?: number;
    expiresAt?: Date;
  }) {
    if (!data?.code || typeof data.code !== "string" || !data.code.trim()) {
      throw ApiError.badRequest("Coupon code is required");
    }
    const code = data.code.trim().toUpperCase();

    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) throw ApiError.badRequest(`Coupon code "${code}" already exists.`);

    return prisma.coupon.create({
      data: {
        code,
        discount: data.discount,
        isPercentage: data.isPercentage ?? true,
        maxUses: data.maxUses,
        expiresAt: data.expiresAt,
        isActive: true,
      },
    });
  }

  static async toggleCouponStatus(couponId: string, isActive: boolean) {
    const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) throw ApiError.notFound("Coupon not found");

    return prisma.coupon.update({
      where: { id: couponId },
      data: { isActive },
    });
  }

  static async deleteCoupon(couponId: string) {
    const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) throw ApiError.notFound("Coupon not found");

    return prisma.coupon.delete({ where: { id: couponId } });
  }
}
