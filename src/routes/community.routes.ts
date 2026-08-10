import { Router } from "express";
import { CommunityController } from "@/controllers/community.controller";
import { authenticate } from "@/middlewares/auth.middleware";

export const communityRouter = Router();

// Student enrolled community feed route
communityRouter.get("/community/student/feed", authenticate, CommunityController.getStudentCommunityFeed);

// Course-level community routes
communityRouter.get("/courses/:courseId/community", authenticate, CommunityController.getCourseCommunity);
communityRouter.post("/courses/:courseId/community", authenticate, CommunityController.createPost);

// Post-level community routes
communityRouter.put("/community/posts/:postId", authenticate, CommunityController.updatePost);
communityRouter.delete("/community/posts/:postId", authenticate, CommunityController.deletePost);
communityRouter.post("/community/posts/:postId/like", authenticate, CommunityController.toggleLikePost);
