import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import creatorRoutes from "./routes/creator.routes";
import studentRoutes from "./routes/student.routes";
import coursesRoutes from "./routes/courses.routes";
import lessonsRoutes from "./routes/lessons.routes";
import cartRoutes from "./routes/cart.routes";
import categoriesRoutes from "./routes/categories.routes";
import creatorsRoutes from "./routes/creators.routes";
import enrollmentsRoutes from "./routes/enrollments.routes";
import myLearningRoutes from "./routes/my-learning.routes";
import notificationsRoutes from "./routes/notifications.routes";
import paymentRoutes from "./routes/payment.routes";
import paymentsRoutes from "./routes/payments.routes";
import profileRoutes from "./routes/profile.routes";
import progressRoutes from "./routes/progress.routes";
import reviewsRoutes from "./routes/reviews.routes";
import supportRoutes from "./routes/support.routes";
import uploadRoutes from "./routes/upload.routes";
import wishlistRoutes from "./routes/wishlist.routes";
import { communityRouter } from "./routes/community.routes";

import { errorHandler } from "./middlewares/error.middleware";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health Check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/creator", creatorRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/lessons", lessonsRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/creators", creatorsRoutes);
app.use("/api/enrollments", enrollmentsRoutes);
app.use("/api/my-learning", myLearningRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api", communityRouter);

// Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend Express server running on http://localhost:${PORT}`);
  });
}

export default app;
