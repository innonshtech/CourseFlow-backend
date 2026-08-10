import { prisma } from "../lib/prisma";
import { Role } from "../types/auth";

export interface CreateNotificationInput {
  recipientId: string;
  recipientRole: Role;
  title: string;
  message: string;
  type: string;
  link?: string;
}

export class NotificationService {
  /**
   * Fetch notifications for a specific user.
   */
  static async getUserNotifications(recipientId: string) {
    return prisma.notification.findMany({
      where: { recipientId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  /**
   * Mark a single notification as read.
   */
  static async markAsRead(notificationId: string, recipientId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, recipientId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications for a user as read.
   */
  static async markAllAsRead(recipientId: string) {
    return prisma.notification.updateMany({
      where: { recipientId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Delete a single notification for a user.
   */
  static async deleteNotification(notificationId: string, recipientId: string) {
    return prisma.notification.deleteMany({
      where: { id: notificationId, recipientId },
    });
  }

  /**
   * Delete all notifications for a user.
   */
  static async deleteAllNotifications(recipientId: string) {
    return prisma.notification.deleteMany({
      where: { recipientId },
    });
  }

  /**
   * Safely create a notification for a user without interrupting main request flows.
   */
  static async createNotification(input: CreateNotificationInput) {
    try {
      return await prisma.notification.create({
        data: {
          recipientId: input.recipientId,
          recipientRole: input.recipientRole,
          title: input.title,
          message: input.message,
          type: input.type,
          link: input.link || null,
        },
      });
    } catch (error) {
      console.error("Failed to create notification:", error);
      return null;
    }
  }

  /**
   * Send notification to all active Admin users.
   */
  static async notifyAdmins(title: string, message: string, type: string, link?: string) {
    try {
      const admins = await prisma.user.findMany({
        where: { role: Role.ADMIN },
        select: { id: true },
      });

      if (admins.length === 0) return;

      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          recipientId: admin.id,
          recipientRole: Role.ADMIN,
          title,
          message,
          type,
          link: link || null,
        })),
      });
    } catch (error) {
      console.error("Failed to notify admins:", error);
    }
  }

  /**
   * Send notification to all students enrolled in a specific course.
   */
  static async notifyEnrolledStudents(
    courseId: string,
    title: string,
    message: string,
    type: string,
    link?: string
  ) {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId },
        select: { userId: true },
      });

      if (enrollments.length === 0) return;

      await prisma.notification.createMany({
        data: enrollments.map((enr) => ({
          recipientId: enr.userId,
          recipientRole: Role.STUDENT,
          title,
          message,
          type,
          link: link || null,
        })),
      });
    } catch (error) {
      console.error("Failed to notify enrolled students:", error);
    }
  }
}
