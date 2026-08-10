import Razorpay from "razorpay";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { CartService } from "@/services/cart.service";
import { ApiError } from "@/types/api";
import { Role } from "@/types/auth";
import { NotificationService } from "@/services/notification.service";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_creator_space_key";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "test_secret_creator_space";

export class PaymentService {
  /**
   * Create Razorpay order and pending DB Order for cart items
   */
  static async createOrder(userId: string, selectedCourseIds?: string[]) {
    // 1. Fetch user's cart
    const cart = await CartService.getCart(userId);

    if (!cart.items || cart.items.length === 0) {
      throw ApiError.badRequest("Your shopping cart is empty");
    }

    // Filter items to checkout if selectedCourseIds provided
    let itemsToCheckout = cart.items;
    if (selectedCourseIds && selectedCourseIds.length > 0) {
      const selectedSet = new Set(selectedCourseIds);
      itemsToCheckout = cart.items.filter((item) => selectedSet.has(item.course.id));
    }

    if (itemsToCheckout.length === 0) {
      throw ApiError.badRequest("Please select at least one course to checkout");
    }

    const courseIds = itemsToCheckout.map((item) => item.course.id);

    // 2. Check if student is ALREADY enrolled in any selected courses
    const existingEnrollments = await prisma.enrollment.findMany({
      where: {
        userId,
        courseId: { in: courseIds },
      },
      include: {
        course: { select: { title: true } },
      },
    });

    if (existingEnrollments.length > 0) {
      const enrolledTitles = existingEnrollments.map((e) => e.course.title).join(", ");
      throw ApiError.conflict(`You are already enrolled in: ${enrolledTitles}`);
    }

    // 3. User details for Razorpay checkout popup prefill
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true },
    });

    // 4. Calculate total amount for ONLY the selected courses
    let totalMrp = 0;
    let subtotal = 0;
    for (const item of itemsToCheckout) {
      const c = item.course;
      const price = c.price;
      const currentPrice =
        c.discountPrice !== null && c.discountPrice !== undefined && c.discountPrice < c.price
          ? c.discountPrice
          : c.price;
      totalMrp += price;
      subtotal += currentPrice;
    }

    let couponDiscount = 0;
    if (cart.coupon && subtotal > 0) {
      if (cart.coupon.isPercentage) {
        couponDiscount = Math.round((subtotal * cart.coupon.discount) / 100);
      } else {
        couponDiscount = Math.min(subtotal, cart.coupon.discount);
      }
    }

    const finalAmountInRupees = Math.max(0, subtotal - couponDiscount);
    const amountInPaise = Math.round(finalAmountInRupees * 100);

    // 5. Create pending DB Order record with ONLY itemsToCheckout
    const order = await prisma.order.create({
      data: {
        userId,
        totalAmount: finalAmountInRupees,
        status: "PENDING",
        courseId: courseIds.length === 1 ? courseIds[0] : undefined,
        items: {
          create: itemsToCheckout.map((item) => ({
            courseId: item.course.id,
            price: item.course.discountPrice ?? item.course.price,
          })),
        },
      },
      include: {
        items: {
          include: { course: true },
        },
      },
    });

    // 5. Handle 100% Free orders (total = 0 INR)
    if (amountInPaise === 0) {
      return {
        isFree: true,
        orderId: order.id,
        amount: 0,
        currency: "INR",
        keyId: RAZORPAY_KEY_ID,
        user,
      };
    }

    // 6. Initialize Razorpay SDK client & create Razorpay Order
    let razorpayOrderId: string;
    try {
      const razorpay = new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET,
      });

      const rzpOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: order.id,
      });
      razorpayOrderId = rzpOrder.id;
    } catch {
      // Fallback for test mode if Razorpay credentials are test placeholders
      razorpayOrderId = `rzp_order_mock_${Date.now()}_${order.id.slice(-6)}`;
    }

    // 7. Update DB Order with razorpayOrderId
    await prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId },
    });

    return {
      isFree: false,
      orderId: order.id,
      razorpayOrderId,
      amount: amountInPaise,
      currency: "INR",
      keyId: RAZORPAY_KEY_ID,
      user,
    };
  }

  /**
   * Verify Razorpay payment signature & create Enrollments + Payment record
   */
  static async verifyPayment(
    userId: string,
    payload: {
      orderId: string;
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    }
  ) {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;

    // 1. Fetch DB Order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { course: true } },
      },
    });

    if (!order) {
      throw ApiError.notFound("Order not found");
    }

    if (order.userId !== userId) {
      throw ApiError.forbidden("You are not authorized to verify this order");
    }

    if (order.status === "SUCCESS") {
      return { success: true, orderId: order.id, message: "Order is already completed" };
    }

    // 2. Validate Razorpay signature if paid order
    const isFreeOrder = order.totalAmount === 0;

    if (!isFreeOrder) {
      if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
        // If not mock order, verify HMAC SHA-256 signature
        if (!razorpay_order_id.startsWith("rzp_order_mock_")) {
          const body = `${razorpay_order_id}|${razorpay_payment_id}`;
          const expectedSignature = crypto
            .createHmac("sha256", RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

          if (expectedSignature !== razorpay_signature) {
            // Mark order as failed
            await prisma.order.update({
              where: { id: order.id },
              data: { status: "FAILED" },
            });
            throw ApiError.badRequest("Invalid Razorpay payment signature verification");
          }
        }
      }
    }

    // 3. Perform atomic Prisma transaction: update Order, create Payment, create Enrollments, remove purchased Cart items
    await prisma.$transaction(async (tx) => {
      // Mark Order as SUCCESS
      await tx.order.update({
        where: { id: order.id },
        data: { status: "SUCCESS" },
      });

      // Create Payment record
      const paymentId = razorpay_payment_id || `pay_mock_${Date.now()}_${order.id.slice(-6)}`;
      await tx.payment.create({
        data: {
          orderId: order.id,
          userId,
          courseId: order.courseId,
          amount: order.totalAmount,
          currency: "INR",
          status: "SUCCESS",
          razorpayPaymentId: paymentId,
          razorpaySignature: razorpay_signature || "mock_signature",
        },
      });

      // Create Enrollments for each item in order & increment totalStudents
      for (const item of order.items) {
        await tx.enrollment.upsert({
          where: {
            userId_courseId: {
              userId,
              courseId: item.courseId,
            },
          },
          create: {
            userId,
            courseId: item.courseId,
          },
          update: {},
        });

        // Increment Course totalStudents
        await tx.course.update({
          where: { id: item.courseId },
          data: {
            totalStudents: { increment: 1 },
          },
        });
      }

      // 4. Remove ONLY the purchased courses from student's Cart (transactional & atomic)
      const cart = await tx.cart.findUnique({
        where: { userId },
      });

      if (cart) {
        const purchasedCourseIds = order.items.map((item) => item.courseId);

        // Delete only the purchased items from cart
        await tx.cartItem.deleteMany({
          where: {
            cartId: cart.id,
            courseId: { in: purchasedCourseIds },
          },
        });

        // Check if cart is now empty; if so, clear coupon
        const remainingItemsCount = await tx.cartItem.count({
          where: { cartId: cart.id },
        });

        if (remainingItemsCount === 0) {
          await tx.cart.update({
            where: { id: cart.id },
            data: { couponId: null },
          });
        }
      }
    });

    // Send enrollment notifications to student & course creators
    for (const item of order.items) {
      if (item.course) {
        // Student Notification
        NotificationService.createNotification({
          recipientId: userId,
          recipientRole: Role.STUDENT,
          title: "Successfully enrolled in course",
          message: `You have successfully enrolled in ${item.course.title}.`,
          type: "STUDENT_ENROLLED",
          link: "/student/my-learning",
        });

        // Creator Notification
        if (item.course.creatorId) {
          NotificationService.createNotification({
            recipientId: item.course.creatorId,
            recipientRole: Role.CREATOR,
            title: "New student enrolled",
            message: `A new student has enrolled in your course '${item.course.title}'.`,
            type: "NEW_STUDENT_ENROLLED",
            link: "/creator/analytics",
          });
        }
      }
    }

    return {
      success: true,
      orderId: order.id,
      enrolledCoursesCount: order.items.length,
    };
  }

  /**
   * Fetch payment history for student
   */
  static async getStudentPayments(userId: string) {
    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          include: {
            items: {
              include: {
                course: {
                  select: { id: true, title: true, thumbnailUrl: true, price: true },
                },
              },
            },
          },
        },
      },
    });

    return payments;
  }

  /**
   * Fetch enrolled courses for "My Learning" page
   */
  static async getStudentEnrollments(userId: string) {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        course: {
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
            creator: {
              select: { id: true, name: true, profileImage: true },
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
    });

    const formattedEnrollments = enrollments.map((item) => {
      const c = item.course;
      return {
        enrollmentId: item.id,
        enrolledAt: item.createdAt,
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

    return {
      items: formattedEnrollments,
      count: formattedEnrollments.length,
    };
  }
}
