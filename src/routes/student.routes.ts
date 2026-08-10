import { Router, Request, Response } from "express";
import { StudentDashboardService } from "@/services/student-dashboard.service";
import { sendSuccess, handleApiError } from "@/utils/api-response";
import { requireStudent } from "@/middlewares/auth.middleware";
import { ApiError } from "@/types/api";

const router = Router();

router.get("/dashboard", ...requireStudent, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const data = await StudentDashboardService.getDashboardData(req.user.id);
    return sendSuccess(res, data, "Student dashboard data retrieved");
  } catch (error) {
    return handleApiError(res, error);
  }
});

export default router;
