export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count?: {
    courses: number;
  };
}

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  isActive?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string | null;
  image?: string | null;
  isActive?: boolean;
}

export interface CategoryFilterParams {
  search?: string;
  status?: "all" | "active" | "inactive";
  sort?: "name_asc" | "name_desc" | "newest" | "oldest";
  page?: number;
  limit?: number;
}

export interface PaginatedCategoriesResponse {
  categories: Category[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
