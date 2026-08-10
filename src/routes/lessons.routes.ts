import { Router, Request, Response } from "express";
import { LessonService } from "../services/lesson.service";
import { LearningService } from "../services/learning.service";
import { sendSuccess, handleApiError } from "../utils/api-response";
import { authenticate, optionalAuthenticate, requireCreator } from "../middlewares/auth.middleware";
import { ApiError } from "../types/api";

import { ProgressService } from "../services/progress.service";

const router = Router();

router.post("/:id/progress", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const lessonId = req.params.id;
    const isCompleted = req.body?.isCompleted;
    const progress = await ProgressService.updateLessonProgress(req.user.id, lessonId, isCompleted);
    return sendSuccess(res, progress, "Lesson progress updated");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.post("/reorder", requireCreator, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const { courseId, lessonOrders } = req.body;
    const reordered = await LessonService.reorderLessons(req.user.id, courseId, lessonOrders);
    return sendSuccess(res, reordered, "Lessons reordered successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.get("/:id", optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || null;
    if (req.user && (req.user.role === "CREATOR" || req.user.role === "ADMIN")) {
      try {
        const creatorLesson = await LessonService.getLessonById(req.user.id, req.params.id);
        return sendSuccess(res, { lesson: creatorLesson }, "Lesson retrieved successfully");
      } catch {
        // Fallback to learning service for non-creator/enrolled student
      }
    }
    const lesson = await LearningService.getLesson(userId, req.params.id);
    return sendSuccess(res, { lesson }, "Lesson retrieved successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

const handlePublishLesson = async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const { isPublished } = req.body;
    const lesson = await LessonService.togglePublishLesson(req.user.id, req.params.id, isPublished);
    return sendSuccess(res, { lesson }, "Lesson publish status updated");
  } catch (error) {
    return handleApiError(res, error);
  }
};

router.patch("/:id/publish", requireCreator, handlePublishLesson);
router.post("/:id/publish", requireCreator, handlePublishLesson);

const handleUpdateLesson = async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const lesson = await LessonService.updateLesson(req.user.id, req.params.id, req.body);
    return sendSuccess(res, { lesson }, "Lesson updated successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
};

router.patch("/:id", requireCreator, handleUpdateLesson);
router.put("/:id", requireCreator, handleUpdateLesson);

router.delete("/:id", requireCreator, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    await LessonService.deleteLesson(req.user.id, req.params.id);
    return sendSuccess(res, null, "Lesson deleted successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

export default router;
