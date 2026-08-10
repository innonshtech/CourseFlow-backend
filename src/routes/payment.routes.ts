import { Router, Request, Response } from "express";
import { PaymentService } from "@/services/payment.service";
import { sendSuccess, handleApiError } from "@/utils/api-response";
import { authenticate } from "@/middlewares/auth.middleware";
import { ApiError } from "@/types/api";

const router = Router();

router.post("/create-order", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const { courseIds } = req.body;
    const orderData = await PaymentService.createOrder(req.user.id, courseIds);
    return sendSuccess(res, orderData, "Razorpay order created successfully", 201);
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.post("/verify", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const verificationResult = await PaymentService.verifyPayment(req.user.id, req.body);
    return sendSuccess(res, verificationResult, "Payment verified and enrollment successful");
  } catch (error) {
    return handleApiError(res, error);
  }
});

export default router;
