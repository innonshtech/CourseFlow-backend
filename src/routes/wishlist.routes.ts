import { Router, Request, Response } from "express";
import { WishlistService } from "../services/wishlist.service";
import { sendSuccess, handleApiError } from "../utils/api-response";
import { authenticate } from "../middlewares/auth.middleware";
import { ApiError } from "../types/api";

const router = Router();

router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const wishlist = await WishlistService.getWishlist(req.user.id);
    return sendSuccess(res, wishlist, "Wishlist retrieved successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const { courseId } = req.body;
    const wishlist = await WishlistService.addToWishlist(req.user.id, courseId);
    return sendSuccess(res, wishlist, "Course added to wishlist", 201);
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.delete("/:courseId", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const wishlist = await WishlistService.removeFromWishlist(req.user.id, req.params.courseId);
    return sendSuccess(res, wishlist, "Course removed from wishlist");
  } catch (error) {
    return handleApiError(res, error);
  }
});

export default router;
