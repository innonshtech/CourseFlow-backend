export interface LessonProgressItem {
  lessonId: string;
  isCompleted: boolean;
  updatedAt?: string | Date;
}

export interface CourseProgressDetails {
  courseId: string;
  courseTitle: string;
  overallProgress: number; // 0 to 100
  completedLessonsCount: number;
  totalLessons: number;
  lessonsRemaining: number;
  isCompleted: boolean;
  completedAt: string | Date | null;
  lastLessonId: string | null;
  nextUncompletedLessonId: string | null;
  completedLessonIds: string[];
}

export interface EnrolledCourseProgressItem {
  enrollmentId: string;
  enrolledAt: string | Date;
  lastLessonId: string | null;
  overallProgress: number;
  completedLessonsCount: number;
  totalLessons: number;
  lessonsRemaining: number;
  isCompleted: boolean;
  completedAt: string | Date | null;
  nextLesson: {
    id: string;
    title: string;
    order: number;
  } | null;
  course: {
    id: string;
    title: string;
    slug: string;
    description: string;
    price: number;
    discountPrice: number | null;
    thumbnailUrl: string | null;
    level: string;
    language: string;
    isPublished: boolean;
    duration: string | null;
    averageRating: number;
    totalStudents: number;
    category?: {
      id: string;
      name: string;
      slug: string;
    } | null;
    creator?: {
      id: string;
      name: string;
      profileImage: string | null;
    } | null;
  };
}

export interface OverallLearningProgress {
  enrolledCoursesCount: number;
  completedCoursesCount: number;
  inProgressCoursesCount: number;
  completedCourses: EnrolledCourseProgressItem[];
  inProgressCourses: EnrolledCourseProgressItem[];
  continueLearning: EnrolledCourseProgressItem | null;
}

export interface UpdateLessonProgressInput {
  lessonId: string;
  isCompleted?: boolean;
}

export interface UpdateLessonProgressResult {
  lessonId: string;
  isCompleted: boolean;
  completedCount: number;
  totalLessons: number;
  lessonsRemaining: number;
  overallProgress: number;
  isCourseCompleted: boolean;
  completedAt: string | Date | null;
  nextUncompletedLessonId: string | null;
}
