import { Router, Request, Response } from "express";
import { ProfileService } from "../services/profile.service";
import { updateProfileSchema, changePasswordSchema } from "../validators/profile";
import { sendSuccess, handleApiError } from "../utils/api-response";
import { authenticate } from "../middlewares/auth.middleware";
import { ApiError } from "../types/api";

const router = Router();

router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const profile = await ProfileService.getProfile(req.user.id);
    return sendSuccess(res, { profile }, "Profile retrieved successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.patch("/", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const validated = await updateProfileSchema.parseAsync(req.body);
    const updated = await ProfileService.updateProfile(req.user.id, validated);
    return sendSuccess(res, { profile: updated }, "Profile updated successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.post("/change-password", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const validated = await changePasswordSchema.parseAsync(req.body);
    await ProfileService.changePassword(req.user.id, validated);
    return sendSuccess(res, null, "Password changed successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

export default router;
