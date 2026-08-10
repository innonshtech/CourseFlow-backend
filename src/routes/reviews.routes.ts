import { Router, Request, Response } from "express";
import { ReviewService } from "@/services/review.service";
import { createReviewSchema, updateReviewSchema } from "@/validators/review";
import { sendSuccess, handleApiError } from "@/utils/api-response";
import { authenticate, optionalAuthenticate } from "@/middlewares/auth.middleware";
import { ApiError } from "@/types/api";

const router = Router();

router.get("/course/:courseId", optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 5;
    const sort = req.query.sort as "newest" | "highest" | "lowest" | undefined;
    const reviews = await ReviewService.getCourseReviews(req.params.courseId, { page, limit, sort }, req.user?.id);
    return sendSuccess(res, reviews, "Course reviews retrieved");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const validated = await createReviewSchema.parseAsync(req.body);
    const review = await ReviewService.createReview(req.user.id, validated);
    return sendSuccess(res, review, "Review submitted successfully", 201);
  } catch (error) {
    return handleApiError(res, error);
  }
});

const handleUpdateReview = async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const validated = await updateReviewSchema.parseAsync(req.body);
    const review = await ReviewService.updateReview(req.user.id, req.params.id, validated);
    return sendSuccess(res, review, "Review updated successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
};

router.patch("/:id", authenticate, handleUpdateReview);
router.put("/:id", authenticate, handleUpdateReview);

router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    await ReviewService.deleteReview(req.user.id, req.params.id);
    return sendSuccess(res, null, "Review deleted successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

export default router;
