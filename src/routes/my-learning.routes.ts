import { Router, Request, Response } from "express";
import { LearningService } from "../services/learning.service";
import { sendSuccess, handleApiError } from "../utils/api-response";
import { authenticate } from "../middlewares/auth.middleware";
import { ApiError } from "../types/api";

const router = Router();

router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const learningData = await LearningService.getMyLearning(req.user.id);
    return sendSuccess(res, learningData, "My learning data retrieved successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

export default router;
