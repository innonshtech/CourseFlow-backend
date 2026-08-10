import { Router, Request, Response } from "express";
import { CreatorDashboardService } from "../services/creator-dashboard.service";
import { CreatorAnalyticsService } from "../services/analytics.service";
import { sendSuccess, handleApiError } from "../utils/api-response";
import { authenticate, requireCreator } from "../middlewares/auth.middleware";
import { ApiError } from "../types/api";

const router = Router();

router.get("/dashboard", ...requireCreator, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const data = await CreatorDashboardService.getDashboardData(req.user.id);
    return sendSuccess(res, data, "Creator dashboard data retrieved");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.get("/analytics", ...requireCreator, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const analytics = await CreatorAnalyticsService.getCreatorAnalytics(req.user.id);
    return sendSuccess(res, analytics, "Analytics data retrieved");
  } catch (error) {
    return handleApiError(res, error);
  }
});

export default router;
