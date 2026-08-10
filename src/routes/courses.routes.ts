import { Router, Request, Response } from "express";
import { CourseService } from "../services/course.service";
import { LessonService } from "../services/lesson.service";
import { sendSuccess, handleApiError } from "../utils/api-response";
import { authenticate, optionalAuthenticate, requireCreator } from "../middlewares/auth.middleware";
import { ApiError } from "../types/api";

const router = Router();

router.get("/", optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const scope = req.query.scope as string;

    if (scope === "creator") {
      if (!req.user) {
        throw ApiError.unauthorized("Authentication required to view creator courses");
      }
      const query = {
        search: req.query.search as string,
        status: req.query.status as any,
        categoryId: (req.query.categoryId || req.query.category) as string,
        level: req.query.level as any,
        sort: (req.query.sort || req.query.sortBy) as any,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 10,
      };
      const result = await CourseService.getCreatorCourses(req.user.id, query);
      return sendSuccess(res, result, "Creator courses retrieved successfully");
    }

    const categoryParam = (req.query.categoryId || req.query.category) as string;
    const sortParam = (req.query.sort || req.query.sortBy) as string;
    const query = {
      search: req.query.search as string,
      categoryId: categoryParam,
      creatorId: req.query.creatorId as string,
      level: req.query.level as any,
      language: req.query.language as string,
      priceType: req.query.priceType as any,
      sort: sortParam as any,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 12,
    };
    const result = await CourseService.getPublishedCourses(query);
    return sendSuccess(res, result, "Courses retrieved successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.post("/", requireCreator, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const course = await CourseService.createCourse(req.user.id, req.body);
    return sendSuccess(res, { course }, "Course created successfully", 201);
  } catch (error) {
    return handleApiError(res, error);
  }
});

const handlePublishCourse = async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const course = await CourseService.togglePublishCourse(req.user.id, req.params.id);
    return sendSuccess(res, { course }, "Course publish status updated");
  } catch (error) {
    return handleApiError(res, error);
  }
};

router.patch("/:id/publish", requireCreator, handlePublishCourse);
router.post("/:id/publish", requireCreator, handlePublishCourse);
router.put("/:id/publish", requireCreator, handlePublishCourse);

const handleDuplicateCourse = async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const course = await CourseService.duplicateCourse(req.user.id, req.params.id);
    return sendSuccess(res, { course }, "Course duplicated successfully", 201);
  } catch (error) {
    return handleApiError(res, error);
  }
};

router.post("/:id/duplicate", requireCreator, handleDuplicateCourse);
router.patch("/:id/duplicate", requireCreator, handleDuplicateCourse);

router.get("/:id", optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const scope = req.query.scope as string;
    if (req.user && (scope === "creator" || req.user.role === "CREATOR" || req.user.role === "ADMIN")) {
      try {
        const course = await CourseService.getCourseById(req.user.id, req.params.id);
        return sendSuccess(res, { course }, "Course retrieved successfully");
      } catch {
        // Fallback to published course lookup
      }
    }
    const course = await CourseService.getPublishedCourseById(req.params.id, req.user?.id);
    return sendSuccess(res, { course }, "Course retrieved successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

const handleUpdateCourse = async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const course = await CourseService.updateCourse(req.user.id, req.params.id, req.body);
    return sendSuccess(res, { course }, "Course updated successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
};

router.put("/:id", requireCreator, handleUpdateCourse);
router.patch("/:id", requireCreator, handleUpdateCourse);

router.delete("/:id", requireCreator, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    await CourseService.deleteCourse(req.user.id, req.params.id);
    return sendSuccess(res, null, "Course deleted successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.get("/:id/lessons", optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const creatorId = req.user?.id || "";
    const query = {
      search: req.query.search as string,
      status: req.query.status as any,
      isPreview: req.query.isPreview !== undefined ? req.query.isPreview === "true" : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 50,
    };
    const lessons = await LessonService.getCourseLessons(creatorId, req.params.id, query);
    return sendSuccess(res, lessons, "Lessons retrieved successfully");
  } catch (error) {
    return handleApiError(res, error);
  }
});

router.post("/:id/lessons", requireCreator, async (req: Request, res: Response) => {
  try {
    if (!req.user) throw ApiError.unauthorized("Authentication required");
    const lesson = await LessonService.createLesson(req.user.id, req.params.id, req.body);
    return sendSuccess(res, { lesson }, "Lesson created successfully", 201);
  } catch (error) {
    return handleApiError(res, error);
  }
});

export default router;
