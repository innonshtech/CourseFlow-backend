import { Router, Request, Response } from "express";
import { PaymentService } from "@/services/payment.service";
import { sendSuccess, handleApiError } from "@/utils/api-response";
import { authenticate } from "@/middlewares/auth.middleware";
import { ApiError } from "@/types/api";

const router = Router();

router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const history = await PaymentService.getStudentPayments(req.user.id);
    return sendSuccess(res, history, "Payment history retrieved");
  } catch (error) {
    return handleApiError(res, error);
  }
});

export default router;
