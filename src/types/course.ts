import { CourseLevel } from "@prisma/client";

export { CourseLevel };

export interface CourseCategoryInfo {
  id: string;
  name: string;
  slug: string;
}

export interface CourseCreatorInfo {
  id: string;
  name: string;
  email: string;
  profileImage: string | null;
  bio?: string | null;
  website?: string | null;
  youtube?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  displayName?: string | null;
  creatorDescription?: string | null;
  totalCourses?: number;
  rating?: number;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl: string | null;
  price: number;
  discountPrice: number | null;
  averageRating: number;
  totalStudents: number;
  totalLessons: number;
  level: CourseLevel;
  language: string;
  duration: string;
  isPublished: boolean;
  isFreePreview: boolean;
  creatorId: string;
  categoryId: string;
  category?: CourseCategoryInfo;
  creator?: CourseCreatorInfo;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CourseDetail extends Course {
  lessons: Array<{
    id: string;
    title: string;
    description: string | null;
    videoUrl: string;
    pdfUrl: string | null;
    duration: number | null;
    order: number;
    isPreview: boolean;
    isPublished: boolean;
  }>;
  reviews?: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date | string;
    user?: {
      id: string;
      name: string;
      profileImage: string | null;
    };
  }>;
}

export interface CreateCourseInput {
  title: string;
  slug?: string;
  description: string;
  thumbnailUrl?: string | null;
  price: number;
  discountPrice?: number | null;
  level: CourseLevel;
  language: string;
  duration: string;
  categoryId: string;
  isFreePreview?: boolean;
  isPublished?: boolean;
}

export interface UpdateCourseInput {
  title?: string;
  slug?: string;
  description?: string;
  thumbnailUrl?: string | null;
  price?: number;
  discountPrice?: number | null;
  level?: CourseLevel;
  language?: string;
  duration?: string;
  categoryId?: string;
  isFreePreview?: boolean;
  isPublished?: boolean;
}

export interface CourseFilterParams {
  search?: string;
  status?: "all" | "published" | "draft";
  categoryId?: string;
  creatorId?: string;
  level?: CourseLevel | "all";
  language?: string;
  priceType?: "all" | "free" | "paid";
  sort?: "newest" | "popular" | "rating" | "oldest" | "title_asc" | "title_desc" | "price_asc" | "price_desc";
  page?: number;
  limit?: number;
}

export interface PaginatedCoursesResponse {
  courses: Course[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
