import { prisma } from "@/lib/prisma";
import { Role, CommunityPostType } from "@prisma/client";
import { ApiError } from "@/types/api";
import { NotificationService } from "@/services/notification.service";

export interface CreateCommunityPostInput {
  title: string;
  content: string;
  type: CommunityPostType;
}

export class CommunityService {
  /**
   * Access check helper for Course Community
   */
  private static async verifyCourseAccess(courseId: string, userId: string, userRole: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, creatorId: true },
    });

    if (!course) {
      throw ApiError.notFound("Course not found");
    }

    // Admin has full access
    if (userRole === Role.ADMIN) {
      return { course, isCreator: true };
    }

    // Course Creator has full access
    if (course.creatorId === userId) {
      return { course, isCreator: true };
    }

    // Student must be enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      throw ApiError.forbidden("Access denied. You must be enrolled in this course to access its community.");
    }

    return { course, isCreator: false };
  }

  /**
   * Get combined community feed for all courses enrolled by a student
   */
  static async getStudentEnrolledCommunityFeed(userId: string) {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      select: { courseId: true },
    });

    if (enrollments.length === 0) {
      return { posts: [] };
    }

    const courseIds = enrollments.map((e) => e.courseId);

    const rawPosts = await prisma.communityPost.findMany({
      where: { courseId: { in: courseIds } },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            role: true,
          },
        },
        likes: {
          where: { userId },
          select: { id: true },
        },
        _count: {
          select: { likes: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const announcements = rawPosts.filter((p) => p.type === CommunityPostType.ANNOUNCEMENT);
    const posts = rawPosts.filter((p) => p.type === CommunityPostType.POST);

    const sortedRaw = [...announcements, ...posts];

    const formattedPosts = sortedRaw.map((p) => ({
      id: p.id,
      courseId: p.courseId,
      course: p.course,
      title: p.title,
      content: p.content,
      type: p.type,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      author: {
        id: p.author.id,
        name: p.author.name,
        profileImage: p.author.profileImage,
        role: p.author.role,
      },
      likesCount: p._count.likes,
      isLiked: p.likes.length > 0,
    }));

    return { posts: formattedPosts };
  }

  /**
   * Get community feed for a course
   */
  static async getCourseCommunity(courseId: string, userId: string, userRole: string) {
    const { isCreator } = await this.verifyCourseAccess(courseId, userId, userRole);

    const rawPosts = await prisma.communityPost.findMany({
      where: { courseId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            role: true,
          },
        },
        likes: {
          where: { userId },
          select: { id: true },
        },
        _count: {
          select: { likes: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Sort announcements first (newest announcement first), then regular posts (newest post first)
    const announcements = rawPosts.filter((p) => p.type === CommunityPostType.ANNOUNCEMENT);
    const posts = rawPosts.filter((p) => p.type === CommunityPostType.POST);

    const sortedRaw = [...announcements, ...posts];

    const formattedPosts = sortedRaw.map((p) => ({
      id: p.id,
      courseId: p.courseId,
      title: p.title,
      content: p.content,
      type: p.type,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      author: {
        id: p.author.id,
        name: p.author.name,
        profileImage: p.author.profileImage,
        role: p.author.role,
      },
      likesCount: p._count.likes,
      isLiked: p.likes.length > 0,
    }));

    return {
      posts: formattedPosts,
      permissions: {
        canCreatePost: isCreator || userRole === Role.ADMIN,
        canDeleteAnyPost: userRole === Role.ADMIN || isCreator,
      },
    };
  }

  /**
   * Create an announcement or community post (Creator & Admin only)
   */
  static async createPost(
    courseId: string,
    userId: string,
    userRole: string,
    data: CreateCommunityPostInput
  ) {
    const { isCreator } = await this.verifyCourseAccess(courseId, userId, userRole);

    if (!isCreator && userRole !== Role.ADMIN) {
      throw ApiError.forbidden("Students are not permitted to create community posts or announcements.");
    }

    if (!data.title || !data.title.trim()) {
      throw ApiError.badRequest("Post title is required.");
    }

    if (!data.content || !data.content.trim()) {
      throw ApiError.badRequest("Post content is required.");
    }

    const post = await prisma.communityPost.create({
      data: {
        courseId,
        authorId: userId,
        title: data.title.trim(),
        content: data.content.trim(),
        type: data.type || CommunityPostType.POST,
      },
      include: {
        course: { select: { title: true } },
        author: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            role: true,
          },
        },
        _count: {
          select: { likes: true },
        },
      },
    });

    // Notify enrolled students automatically
    const isAnnouncement = post.type === CommunityPostType.ANNOUNCEMENT;
    const courseTitle = post.course?.title || "your enrolled course";
    const notifTitle = isAnnouncement ? `📢 New Announcement in ${courseTitle}` : `💬 New Update in ${courseTitle}`;
    const notifMsg = `${post.title}: ${post.content.substring(0, 100)}${post.content.length > 100 ? "..." : ""}`;

    NotificationService.notifyEnrolledStudents(
      courseId,
      notifTitle,
      notifMsg,
      isAnnouncement ? "COURSE_ANNOUNCEMENT" : "COURSE_UPDATE",
      `/student/courses/${courseId}`
    ).catch((err) => console.error("Notification dispatch error:", err));

    return {
      id: post.id,
      courseId: post.courseId,
      title: post.title,
      content: post.content,
      type: post.type,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: {
        id: post.author.id,
        name: post.author.name,
        profileImage: post.author.profileImage,
        role: post.author.role,
      },
      likesCount: 0,
      isLiked: false,
    };
  }

  /**
   * Delete a post (Creator/Author or Admin)
   */
  static async deletePost(postId: string, userId: string, userRole: string) {
    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      include: { course: { select: { creatorId: true } } },
    });

    if (!post) {
      throw ApiError.notFound("Post not found.");
    }

    const isAuthor = post.authorId === userId;
    const isCourseCreator = post.course.creatorId === userId;
    const isAdmin = userRole === Role.ADMIN;

    if (!isAuthor && !isCourseCreator && !isAdmin) {
      throw ApiError.forbidden("You do not have permission to delete this post.");
    }

    await prisma.communityPost.delete({
      where: { id: postId },
    });

    return { message: "Post deleted successfully" };
  }

  /**
   * Update an existing post (Creator/Author or Admin)
   */
  static async updatePost(
    postId: string,
    userId: string,
    userRole: string,
    data: { title?: string; content?: string; type?: CommunityPostType }
  ) {
    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      include: { course: { select: { creatorId: true } } },
    });

    if (!post) {
      throw ApiError.notFound("Post not found.");
    }

    const isAuthor = post.authorId === userId;
    const isCourseCreator = post.course.creatorId === userId;
    const isAdmin = userRole === Role.ADMIN;

    if (!isAuthor && !isCourseCreator && !isAdmin) {
      throw ApiError.forbidden("You do not have permission to edit this post.");
    }

    const updated = await prisma.communityPost.update({
      where: { id: postId },
      data: {
        title: data.title ? data.title.trim() : post.title,
        content: data.content ? data.content.trim() : post.content,
        type: data.type || post.type,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            role: true,
          },
        },
        _count: {
          select: { likes: true },
        },
      },
    });

    return {
      id: updated.id,
      courseId: updated.courseId,
      title: updated.title,
      content: updated.content,
      type: updated.type,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      author: {
        id: updated.author.id,
        name: updated.author.name,
        profileImage: updated.author.profileImage,
        role: updated.author.role,
      },
    };
  }

  /**
   * Toggle Like / Unlike on a community post
   */
  static async toggleLikePost(postId: string, userId: string, userRole: string) {
    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, courseId: true },
    });

    if (!post) {
      throw ApiError.notFound("Post not found.");
    }

    // Verify course community access
    await this.verifyCourseAccess(post.courseId, userId, userRole);

    const existingLike = await prisma.communityPostLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingLike) {
      await prisma.communityPostLike.delete({
        where: { id: existingLike.id },
      });
    } else {
      await prisma.communityPostLike.create({
        data: {
          postId,
          userId,
        },
      });
    }

    const likesCount = await prisma.communityPostLike.count({
      where: { postId },
    });

    return {
      isLiked: !existingLike,
      likesCount,
    };
  }
}
