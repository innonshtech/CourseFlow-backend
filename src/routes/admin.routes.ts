import { Router, Request, Response } from "express";
import { AdminDashboardService } from "../services/admin-dashboard.service";
import { sendSuccess, handleApiError } from "../utils/api-response";
import { requireAdmin } from "../middlewares/auth.middleware";

const router = Router();

router.get("/dashboard", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const overview = await AdminDashboardService.getPlatformOverview();
    return sendSuccess(res, overview, "Admin dashboard platform overview retrieved");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.get("/users", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const role = req.query.role as string;
    const search = req.query.search as string;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const usersData = await AdminDashboardService.getUsers({ role, search, page, limit });
    return sendSuccess(res, usersData, "Users retrieved successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.patch("/users", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.body;
    const user = await AdminDashboardService.updateUserRoleOrStatus(userId, { role });
    return sendSuccess(res, user, "User role updated successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.get("/courses", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const categoryId = req.query.categoryId as string;
    const search = req.query.search as string;
    const sort = req.query.sort as string;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    const coursesData = await AdminDashboardService.getAdminCourses({ status, categoryId, search, sort, page, limit });
    return sendSuccess(res, coursesData, "Admin courses retrieved successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.get("/courses/:id", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const course = await AdminDashboardService.getAdminCourseDetails(req.params.id);
    return sendSuccess(res, course, "Admin course inspection details retrieved");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.patch("/courses", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const { courseId, isPublished } = req.body;
    const course = await AdminDashboardService.toggleCoursePublish(courseId, isPublished);
    return sendSuccess(res, course, "Course publish status updated");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.post("/courses/:id/toggle-publish", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const { isPublished } = req.body;
    const course = await AdminDashboardService.toggleCoursePublish(req.params.id, isPublished);
    return sendSuccess(res, course, "Course publish status toggled");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.delete("/courses", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const courseId = (req.query.courseId as string) || req.params.id;
    await AdminDashboardService.deleteAdminCourse(courseId);
    return sendSuccess(res, null, "Course deleted by admin");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.delete("/courses/:id", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    await AdminDashboardService.deleteAdminCourse(req.params.id);
    return sendSuccess(res, null, "Course deleted by admin");
  } catch (error) {
    return handleApiError(res, error);
  }
});

/* ── Categories Endpoints ─────────────────────────────────────────── */
router.get("/categories", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const categories = await AdminDashboardService.getAdminCategories(search);
    return sendSuccess(res, categories, "Categories retrieved successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.post("/categories", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const category = await AdminDashboardService.createCategory(req.body);
    return sendSuccess(res, category, "Category created successfully", 201);
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.put("/categories", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id, name, description, icon, isActive } = req.body;
    const category = await AdminDashboardService.updateCategory(id, { name, description, icon, isActive });
    return sendSuccess(res, category, "Category updated successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.delete("/categories", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = (req.query.id as string) || req.params.id;
    await AdminDashboardService.deleteCategory(id);
    return sendSuccess(res, null, "Category deleted successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

/* ── Payments Endpoints ───────────────────────────────────────────── */
router.get("/payments", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const search = req.query.search as string;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const paymentsData = await AdminDashboardService.getPayments({ status, search, page, limit });
    return sendSuccess(res, paymentsData, "Payments retrieved successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

/* ── Coupons Endpoints ────────────────────────────────────────────── */
router.get("/coupons", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const coupons = await AdminDashboardService.getCoupons();
    return sendSuccess(res, coupons, "Coupons retrieved successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.post("/coupons", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const coupon = await AdminDashboardService.createCoupon(req.body);
    return sendSuccess(res, coupon, "Coupon created successfully", 201);
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.patch("/coupons", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const { couponId, isActive } = req.body;
    const coupon = await AdminDashboardService.toggleCouponStatus(couponId, isActive);
    return sendSuccess(res, coupon, "Coupon status updated");
  } catch (error) {
    return handleApiError(res, error);
  }
});

/* ── Creators Endpoints ───────────────────────────────────────────── */
router.get("/creators", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const status = req.query.status as string;
    const sort = req.query.sort as string;
    const data = await AdminDashboardService.getAdminCreators({ search, status, sort });
    return sendSuccess(res, data, "Creators retrieved successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.patch("/creators/:id/verify", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status, rejectionReason } = req.body;
    const creator = await AdminDashboardService.updateCreatorVerificationStatus(
      req.params.id,
      status,
      rejectionReason,
      req.user?.id
    );
    return sendSuccess(res, creator, "Creator verification status updated successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

export default router;
