import { Router, Request, Response } from "express";
import { PaymentService } from "@/services/payment.service";
import { LearningService } from "@/services/learning.service";
import { sendSuccess, handleApiError } from "@/utils/api-response";
import { authenticate } from "@/middlewares/auth.middleware";
import { ApiError } from "@/types/api";

const router = Router();

router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const enrollments = await PaymentService.getStudentEnrollments(req.user.id);
    return sendSuccess(res, enrollments, "Enrolled courses retrieved");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.get("/:courseId", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const details = await LearningService.getCourseLearningDetails(req.user.id, req.params.courseId);
    return sendSuccess(res, details, "Course learning details retrieved");
  } catch (error) {
    return handleApiError(res, error);
  }
});

export default router;
