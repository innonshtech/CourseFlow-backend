import { Router, Request, Response } from "express";
import { sendSuccess, handleApiError } from "@/utils/api-response";
import { optionalAuthenticate } from "@/middlewares/auth.middleware";
import { NotificationService } from "@/services/notification.service";
import { z } from "zod";

const router = Router();

const supportSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(3, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

router.post("/", optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const validated = await supportSchema.parseAsync(req.body);

    NotificationService.notifyAdmins(
      `Support Inquiry: ${validated.subject}`,
      `From ${validated.name} (${validated.email}): ${validated.message.slice(0, 100)}...`,
      "SUPPORT_INQUIRY",
      "/admin/dashboard"
    );

    return sendSuccess(res, { received: true }, "Support request submitted successfully", 201);
  } catch (error) {
    return handleApiError(res, error);
  }
});

export default router;
