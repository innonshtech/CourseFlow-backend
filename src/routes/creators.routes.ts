import { Router, Request, Response } from "express";
import { CreatorService } from "@/services/creator.service";
import { sendSuccess, handleApiError } from "@/utils/api-response";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const creators = await CreatorService.getFeaturedCreators(limit);
    return sendSuccess(res, { creators }, "Creators retrieved successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const creator = await CreatorService.getCreatorById(req.params.id);
    return sendSuccess(res, creator, "Creator detail retrieved successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

export default router;
