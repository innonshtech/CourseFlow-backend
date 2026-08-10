import { Request, Response } from "express";
import { CommunityService } from "@/services/community.service";
import { sendSuccess, handleApiError } from "@/utils/api-response";

export class CommunityController {
  /**
   * GET /api/courses/:courseId/community
   */
  static async getCourseCommunity(req: Request, res: Response) {
    try {
      const { courseId } = req.params;
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      const result = await CommunityService.getCourseCommunity(courseId, userId, userRole);
      return sendSuccess(res, result, "Community feed fetched successfully");
    } catch (error) {
      return handleApiError(res, error);
    }
  }

  /**
   * GET /api/community/student/feed
   */
  static async getStudentCommunityFeed(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      const result = await CommunityService.getStudentEnrolledCommunityFeed(userId);
      return sendSuccess(res, result, "Student enrolled community feed fetched successfully");
    } catch (error) {
      return handleApiError(res, error);
    }
  }

  /**
   * POST /api/courses/:courseId/community
   */
  static async createPost(req: Request, res: Response) {
    try {
      const { courseId } = req.params;
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;
      const { title, content, type } = req.body;

      const post = await CommunityService.createPost(courseId, userId, userRole, {
        title,
        content,
        type,
      });

      return sendSuccess(res, post, "Post created successfully", 201);
    } catch (error) {
      return handleApiError(res, error);
    }
  }

  /**
   * DELETE /api/community/posts/:postId
   */
  static async deletePost(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      const result = await CommunityService.deletePost(postId, userId, userRole);
      return sendSuccess(res, result, "Post deleted successfully");
    } catch (error) {
      return handleApiError(res, error);
    }
  }

  /**
   * PUT /api/community/posts/:postId
   */
  static async updatePost(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;
      const { title, content, type } = req.body;

      const result = await CommunityService.updatePost(postId, userId, userRole, {
        title,
        content,
        type,
      });

      return sendSuccess(res, result, "Post updated successfully");
    } catch (error) {
      return handleApiError(res, error);
    }
  }

  /**
   * POST /api/community/posts/:postId/like
   */
  static async toggleLikePost(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      const result = await CommunityService.toggleLikePost(postId, userId, userRole);
      return sendSuccess(res, result, "Like status updated");
    } catch (error) {
      return handleApiError(res, error);
    }
  }
}
