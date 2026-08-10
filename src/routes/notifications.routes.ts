import { Router, Request, Response } from "express";
import { NotificationService } from "@/services/notification.service";
import { sendSuccess, handleApiError } from "@/utils/api-response";
import { authenticate } from "@/middlewares/auth.middleware";
import { ApiError } from "@/types/api";

const router = Router();

router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const notifications = await NotificationService.getUserNotifications(req.user.id);
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    return sendSuccess(res, { notifications, unreadCount }, "Notifications retrieved");
  } catch (error) {
    return handleApiError(res, error);
  }
});

const handleMarkAllRead = async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    await NotificationService.markAllAsRead(req.user.id);
    return sendSuccess(res, null, "All notifications marked as read");
  } catch (error) {
    return handleApiError(res, error);
  }
};

router.post("/mark-all-read", authenticate, handleMarkAllRead);
router.patch("/mark-all-read", authenticate, handleMarkAllRead);

router.patch("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const notification = await NotificationService.markAsRead(req.params.id, req.user.id);
    return sendSuccess(res, notification, "Notification marked as read");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    await NotificationService.deleteNotification(req.params.id, req.user.id);
    return sendSuccess(res, null, "Notification deleted successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.delete("/", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    await NotificationService.deleteAllNotifications(req.user.id);
    return sendSuccess(res, null, "All notifications deleted successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

export default router;
