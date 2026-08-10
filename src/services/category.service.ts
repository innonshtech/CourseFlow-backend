import { prisma } from "@/lib/prisma";
import { ApiError } from "@/types/api";
import {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryFilterParams,
  PaginatedCategoriesResponse,
} from "@/types/category";

export class CategoryService {
  /**
   * Returns paginated, searchable, filterable categories.
   */
  static async getCategories(
    params: CategoryFilterParams = {}
  ): Promise<PaginatedCategoriesResponse> {
    const {
      search = "",
      status = "all",
      sort = "newest",
      page = 1,
      limit = 10,
    } = params;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status === "active") where.isActive = true;
    if (status === "inactive") where.isActive = false;

    if (search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { slug: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    // Build orderBy
    let orderBy: Record<string, string> = { createdAt: "desc" };
    if (sort === "name_asc") orderBy = { name: "asc" };
    if (sort === "name_desc") orderBy = { name: "desc" };
    if (sort === "oldest") orderBy = { createdAt: "asc" };

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { _count: { select: { courses: true } } },
      }),
      prisma.category.count({ where }),
    ]);

    return {
      categories: categories as Category[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Returns a single category by ID or slug.
   */
  static async getCategoryById(idOrSlug: string): Promise<Category> {
    const category = await prisma.category.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: { _count: { select: { courses: true } } },
    });
    if (!category) throw ApiError.notFound("Category not found");
    return category as Category;
  }

  /**
   * Creates a new category ensuring unique name and slug.
   */
  static async createCategory(data: CreateCategoryInput): Promise<Category> {
    const nameTrimmed = data.name.trim();
    const slugTrimmed = data.slug.trim();

    // Unique name check
    const existingByName = await prisma.category.findFirst({
      where: { name: { equals: nameTrimmed, mode: "insensitive" } },
    });
    if (existingByName)
      throw ApiError.conflict("A category with this name already exists");

    // Unique slug check
    const existingBySlug = await prisma.category.findFirst({
      where: { slug: { equals: slugTrimmed, mode: "insensitive" } },
    });
    if (existingBySlug)
      throw ApiError.conflict("A category with this slug already exists");

    const category = await prisma.category.create({
      data: {
        name: nameTrimmed,
        slug: slugTrimmed,
        description: data.description?.trim() || null,
        image: data.image || null,
        isActive: data.isActive ?? true,
      },
      include: { _count: { select: { courses: true } } },
    });

    return category as Category;
  }

  /**
   * Updates a category ensuring unique name/slug among other records.
   */
  static async updateCategory(
    id: string,
    data: UpdateCategoryInput
  ): Promise<Category> {
    await this.getCategoryById(id); // ensure exists

    if (data.name) {
      const nameTrimmed = data.name.trim();
      const dup = await prisma.category.findFirst({
        where: {
          name: { equals: nameTrimmed, mode: "insensitive" },
          NOT: { id },
        },
      });
      if (dup) throw ApiError.conflict("A category with this name already exists");
    }

    if (data.slug) {
      const slugTrimmed = data.slug.trim();
      const dup = await prisma.category.findFirst({
        where: {
          slug: { equals: slugTrimmed, mode: "insensitive" },
          NOT: { id },
        },
      });
      if (dup) throw ApiError.conflict("A category with this slug already exists");
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.slug && { slug: data.slug.trim() }),
        ...(data.description !== undefined && {
          description: data.description?.trim() || null,
        }),
        ...(data.image !== undefined && { image: data.image || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: { _count: { select: { courses: true } } },
    });

    return updated as Category;
  }

  /**
   * Soft deletes a category by setting isActive = false.
   */
  static async softDeleteCategory(id: string): Promise<Category> {
    await this.getCategoryById(id);
    const updated = await prisma.category.update({
      where: { id },
      data: { isActive: false },
      include: { _count: { select: { courses: true } } },
    });
    return updated as Category;
  }

  /**
   * Restores a soft-deleted category by setting isActive = true.
   */
  static async restoreCategory(id: string): Promise<Category> {
    await this.getCategoryById(id);
    const updated = await prisma.category.update({
      where: { id },
      data: { isActive: true },
      include: { _count: { select: { courses: true } } },
    });
    return updated as Category;
  }
}
