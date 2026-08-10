import { Router, Request, Response } from "express";
import { CartService } from "../services/cart.service";
import { sendSuccess, handleApiError } from "../utils/api-response";
import { authenticate } from "../middlewares/auth.middleware";
import { ApiError } from "../types/api";

const router = Router();

router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const cart = await CartService.getCart(req.user.id);
    return sendSuccess(res, cart, "Cart retrieved successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const { courseId } = req.body;
    const cart = await CartService.addToCart(req.user.id, courseId);
    return sendSuccess(res, cart, "Course added to cart", 201);
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.post("/apply-coupon", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const rawCode = req.body?.code ?? req.body?.couponCode;
    if (typeof rawCode !== "string" || !rawCode.trim()) {
      throw ApiError.badRequest("Please enter a valid coupon code");
    }
    const cart = await CartService.applyCoupon(req.user.id, rawCode);
    return sendSuccess(res, cart, "Coupon applied successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.delete("/apply-coupon", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const result = await CartService.removeCoupon(req.user.id);
    return sendSuccess(res, result, "Coupon removed successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.delete("/coupon", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const result = await CartService.removeCoupon(req.user.id);
    return sendSuccess(res, result, "Coupon removed successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.delete("/", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    await CartService.clearCart(req.user.id);
    return sendSuccess(res, null, "Cart cleared successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.delete("/:courseId", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const cart = await CartService.removeFromCart(req.user.id, req.params.courseId);
    return sendSuccess(res, cart, "Course removed from cart");
  } catch (error) {
    return handleApiError(res, error);
  }
});

export default router;
