import { Router, Request, Response } from "express";
import { CategoryService } from "../services/category.service";
import { sendSuccess, handleApiError } from "../utils/api-response";
import { requireAdmin } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const status = req.query.status as any;
    const sort = req.query.sort as any;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 100;

    const result = await CategoryService.getCategories({ search, status, sort, page, limit });
    return sendSuccess(res, result, "Categories retrieved successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.post("/", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const category = await CategoryService.createCategory(req.body);
    return sendSuccess(res, category, "Category created successfully", 201);
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const category = await CategoryService.getCategoryById(req.params.id);
    return sendSuccess(res, category, "Category retrieved successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.patch("/:id", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const category = await CategoryService.updateCategory(req.params.id, req.body);
    return sendSuccess(res, category, "Category updated successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.delete("/:id", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    await CategoryService.softDeleteCategory(req.params.id);
    return sendSuccess(res, null, "Category deactivated successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.post("/:id/restore", ...requireAdmin, async (req: Request, res: Response) => {
  try {
    const category = await CategoryService.restoreCategory(req.params.id);
    return sendSuccess(res, category, "Category restored successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

export default router;
