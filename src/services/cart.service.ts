import { prisma } from "../lib/prisma";
import { ApiError } from "../types/api";

export class CartService {
  /**
   * Get or create student's cart
   */
  private static async getOrCreateCart(userId: string) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      });
    }

    return cart;
  }

  /**
   * Get student's cart with items and summary calculation
   */
  static async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    // Fetch cart with items & coupon
    const cartDetails = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        coupon: true,
        items: {
          orderBy: { createdAt: "desc" },
          include: {
            course: {
              include: {
                category: {
                  select: { id: true, name: true, slug: true },
                },
                creator: {
                  select: {
                    id: true,
                    name: true,
                    profileImage: true,
                  },
                },
                _count: {
                  select: {
                    lessons: {
                      where: { isPublished: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cartDetails) {
      throw ApiError.internal("Failed to retrieve cart details");
    }

    // 1. Validate applied coupon if present
    let appliedCoupon = cartDetails.coupon;
    if (appliedCoupon) {
      const now = new Date();
      const isExpired = appliedCoupon.expiresAt && appliedCoupon.expiresAt < now;
      const isLimitReached = appliedCoupon.maxUses !== null && appliedCoupon.usedCount >= appliedCoupon.maxUses;
      
      if (!appliedCoupon.isActive || isExpired || isLimitReached) {
        // Detach invalid coupon
        await prisma.cart.update({
          where: { id: cart.id },
          data: { couponId: null },
        });
        appliedCoupon = null;
      }
    }

    // 2. Format items
    const formattedItems = cartDetails.items.map((item) => {
      const c = item.course;
      return {
        cartItemId: item.id,
        addedAt: item.createdAt,
        course: {
          id: c.id,
          title: c.title,
          slug: c.slug,
          description: c.description,
          price: c.price,
          discountPrice: c.discountPrice,
          thumbnailUrl: c.thumbnailUrl,
          level: c.level,
          language: c.language,
          isPublished: c.isPublished,
          isFreePreview: c.isFreePreview,
          duration: c.duration,
          averageRating: c.averageRating,
          totalStudents: c.totalStudents,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          category: c.category,
          creator: c.creator,
          totalLessons: c._count.lessons,
        },
      };
    });

    // 3. Calculate Cart Summary
    let totalMrp = 0;
    let totalDiscount = 0;

    formattedItems.forEach((item) => {
      const originalPrice = item.course.price || 0;
      const effectivePrice =
        item.course.discountPrice !== null &&
        item.course.discountPrice !== undefined &&
        item.course.discountPrice < originalPrice
          ? item.course.discountPrice
          : originalPrice;

      totalMrp += originalPrice;
      totalDiscount += originalPrice - effectivePrice;
    });

    const subtotal = totalMrp - totalDiscount;

    let couponDiscount = 0;
    if (appliedCoupon && subtotal > 0) {
      if (appliedCoupon.isPercentage) {
        couponDiscount = Math.round(subtotal * (appliedCoupon.discount / 100));
      } else {
        couponDiscount = appliedCoupon.discount;
      }
      couponDiscount = Math.min(couponDiscount, subtotal);
    }

    const finalAmount = Math.max(0, subtotal - couponDiscount);

    return {
      items: formattedItems,
      count: formattedItems.length,
      coupon: appliedCoupon
        ? {
            id: appliedCoupon.id,
            code: appliedCoupon.code,
            description: appliedCoupon.description,
            discount: appliedCoupon.discount,
            isPercentage: appliedCoupon.isPercentage,
          }
        : null,
      summary: {
        totalMrp,
        totalDiscount,
        subtotal,
        couponDiscount,
        finalAmount,
      },
    };
  }

  /**
   * Add a course to student's cart
   */
  static async addToCart(userId: string, courseId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, isPublished: true, title: true },
    });

    if (!course) {
      throw ApiError.notFound("Course not found");
    }

    if (!course.isPublished) {
      throw ApiError.badRequest("Cannot add unpublished course to cart");
    }

    const cart = await this.getOrCreateCart(userId);

    const existing = await prisma.cartItem.findUnique({
      where: {
        cartId_courseId: {
          cartId: cart.id,
          courseId,
        },
      },
    });

    if (existing) {
      throw ApiError.conflict("Course is already in your cart");
    }

    const newItem = await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        courseId,
      },
    });

    return newItem;
  }

  /**
   * Remove a course from student's cart
   */
  static async removeFromCart(userId: string, courseId: string) {
    const cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      throw ApiError.notFound("Cart not found");
    }

    const existing = await prisma.cartItem.findUnique({
      where: {
        cartId_courseId: {
          cartId: cart.id,
          courseId,
        },
      },
    });

    if (!existing) {
      throw ApiError.notFound("Course is not in your cart");
    }

    await prisma.cartItem.delete({
      where: { id: existing.id },
    });

    return { success: true };
  }

  /**
   * Clear all items from student's cart
   */
  static async clearCart(userId: string) {
    const cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) return { success: true };

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    await prisma.cart.update({
      where: { id: cart.id },
      data: { couponId: null },
    });

    return { success: true };
  }

  /**
   * Apply coupon to student's cart
   */
  static async applyCoupon(userId: string, code: string) {
    if (typeof code !== "string" || !code.trim()) {
      throw ApiError.badRequest("Please enter a valid coupon code");
    }
    const cleanCode = code.trim().toUpperCase();

    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (!coupon || !coupon.isActive) {
      throw ApiError.badRequest("Invalid or inactive coupon code");
    }

    const now = new Date();
    if (coupon.expiresAt && coupon.expiresAt < now) {
      throw ApiError.badRequest("Coupon code has expired");
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw ApiError.badRequest("Coupon usage limit has been reached");
    }

    const cart = await this.getOrCreateCart(userId);

    await prisma.cart.update({
      where: { id: cart.id },
      data: { couponId: coupon.id },
    });

    return coupon;
  }

  /**
   * Remove applied coupon from student's cart
   */
  static async removeCoupon(userId: string) {
    const cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) return { success: true };

    await prisma.cart.update({
      where: { id: cart.id },
      data: { couponId: null },
    });

    return { success: true };
  }
}
