export interface Lesson {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  pdfUrl: string | null;
  duration: number | null; // duration in minutes
  order: number;
  isPreview: boolean;
  isPublished: boolean;
  courseId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateLessonInput {
  title: string;
  description?: string | null;
  videoUrl: string;
  pdfUrl?: string | null;
  duration?: number | null;
  order?: number | null;
  isPreview?: boolean;
  isPublished?: boolean;
}

export interface UpdateLessonInput {
  title?: string;
  description?: string | null;
  videoUrl?: string;
  pdfUrl?: string | null;
  duration?: number | null;
  order?: number | null;
  isPreview?: boolean;
  isPublished?: boolean;
}

export interface LessonFilterParams {
  search?: string;
  status?: "all" | "published" | "draft";
  isPreview?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedLessonsResponse {
  lessons: Lesson[];
  total: number;
  counts?: {
    all: number;
    published: number;
    draft: number;
  };
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReorderLessonItem {
  id: string;
  order: number;
}

export interface ReorderLessonsInput {
  courseId: string;
  items: ReorderLessonItem[];
}
