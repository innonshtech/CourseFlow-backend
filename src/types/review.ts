export interface ReviewUser {
  id: string;
  name: string;
  profileImage: string | null;
}

export interface Review {
  id: string;
  rating: number; // 1 - 5
  comment: string | null;
  userId: string;
  courseId: string;
  createdAt: string | Date;
  user: ReviewUser;
}

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface CourseReviewsResponse {
  reviews: Review[];
  total: number;
  page: number;
  totalPages: number;
  averageRating: number;
  ratingDistribution: RatingDistribution;
  userReview: Review | null;
}

export interface CreateReviewInput {
  courseId: string;
  rating: number;
  comment?: string;
}

export interface UpdateReviewInput {
  rating?: number;
  comment?: string;
}

export interface ReviewFilterParams {
  sort?: "newest" | "highest" | "lowest";
  page?: number;
  limit?: number;
}
