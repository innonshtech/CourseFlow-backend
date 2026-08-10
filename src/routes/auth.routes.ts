import { Router, Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { PasswordResetService } from "../services/password-reset.service";
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from "../validators/auth";
import { setAuthCookie, clearAuthCookie } from "../utils/jwt";
import { sendSuccess, handleApiError } from "../utils/api-response";
import { authenticate } from "../middlewares/auth.middleware";
import { ApiError } from "../types/api";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  try {
    const validated = await registerSchema.parseAsync(req.body);
    const result = await AuthService.registerUser(validated);
    if (result.token) {
      setAuthCookie(res, result.token);
    }
    return sendSuccess(res, { user: result.user }, "Account registered successfully", 201);
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const validated = await loginSchema.parseAsync(req.body);
    const result = await AuthService.loginUser(validated);
    if (result.token) {
      setAuthCookie(res, result.token);
    }
    return sendSuccess(res, { user: result.user }, "Logged in successfully", 200);
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.post("/logout", (req: Request, res: Response) => {
  clearAuthCookie(res);
  return sendSuccess(res, null, "Logged out successfully", 200);
});

router.get("/me", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const user = await AuthService.getUserById(req.user.id);
    return sendSuccess(res, { user }, "User profile fetched successfully", 200);
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const validated = await forgotPasswordSchema.parseAsync(req.body);
    const originUrl = req.headers.origin || process.env.FRONTEND_URL || "http://localhost:3000";
    const message = await PasswordResetService.requestPasswordReset(validated.email, originUrl);
    return sendSuccess(res, { message }, message, 200);
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const validated = await resetPasswordSchema.parseAsync(req.body);
    await PasswordResetService.resetPassword(validated.token, validated.password);
    return sendSuccess(res, null, "Password reset successfully", 200);
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.get("/verify-reset-token", async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    if (!token) throw ApiError.badRequest("Reset token is required");
    const result = await PasswordResetService.verifyToken(token);
    return sendSuccess(res, result, "Token status checked", 200);
  } catch (error) {
    return handleApiError(res, error);
  }
});

export default router;
