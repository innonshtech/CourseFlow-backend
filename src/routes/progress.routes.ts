import { Router, Request, Response } from "express";
import { ProgressService } from "../services/progress.service";
import { sendSuccess, handleApiError } from "../utils/api-response";
import { authenticate } from "../middlewares/auth.middleware";
import { ApiError } from "../types/api";

const router = Router();

router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const progressList = await ProgressService.getOverallProgress(req.user.id);
    return sendSuccess(res, progressList, "Overall progress retrieved");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.get("/:courseId", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const progress = await ProgressService.getCourseProgress(req.user.id, req.params.courseId);
    return sendSuccess(res, progress, "Course progress retrieved");
  } catch (error) {
    return handleApiError(res, error);
  }
});

const handleUpdateLessonProgress = async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const { lessonId, isCompleted } = req.body;
    const progress = await ProgressService.updateLessonProgress(req.user.id, lessonId, isCompleted);
    return sendSuccess(res, progress, "Lesson progress updated");
  } catch (error) {
    return handleApiError(res, error);
  }
};

router.post("/lesson", authenticate, handleUpdateLessonProgress);
router.patch("/lesson", authenticate, handleUpdateLessonProgress);

export default router;
