import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/utils/password";
import { sendPasswordResetEmail } from "@/lib/mail";
import { ApiError } from "@/types/api";

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export class PasswordResetService {
  /**
   * Hashes a raw token string using SHA-256.
   * Only hashed tokens are saved in database storage.
   */
  private static hashToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
  }

  /**
   * Handles a Forgot Password request with explicit email existence validation.
   */
  static async requestPasswordReset(email: string, originUrl: string): Promise<string> {
    if (!email || !email.trim()) {
      throw ApiError.badRequest("Please enter a valid email address.");
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check whether the email exists in the database
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw ApiError.notFound("No account found with this email address.");
    }

    try {
      // Generate cryptographically secure random token (32 bytes = 64 hex chars)
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = this.hashToken(rawToken);

      // Invalidate any existing unused reset tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      // Store hashed token with 1-hour expiration timestamp
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: hashedToken,
          expiresAt,
        },
      });

      // Construct reset password link
      const resetUrl = `${originUrl}/reset-password?token=${rawToken}`;

      // Send email via Nodemailer SMTP
      await sendPasswordResetEmail(user.email, resetUrl, user.name);

      return "A password reset link has been sent to your registered email address.";
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error("PasswordResetService.requestPasswordReset error:", error);
      throw ApiError.internal("Something went wrong. Please try again.");
    }
  }

  /**
   * Verifies if a raw reset token is valid, unused, and not expired.
   */
  static async verifyToken(rawToken: string): Promise<{ valid: boolean; message?: string }> {
    if (!rawToken || typeof rawToken !== "string" || !rawToken.trim()) {
      return { valid: false, message: "Reset token is missing or invalid." };
    }

    const hashedToken = this.hashToken(rawToken.trim());

    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
    });

    if (!tokenRecord) {
      return { valid: false, message: "Invalid or expired password reset link." };
    }

    if (new Date() > tokenRecord.expiresAt) {
      // Clean up expired token
      await prisma.passwordResetToken.delete({ where: { id: tokenRecord.id } }).catch(() => {});
      return { valid: false, message: "Password reset link has expired. Please request a new one." };
    }

    return { valid: true };
  }

  /**
   * Resets user password using a valid raw reset token.
   */
  static async resetPassword(rawToken: string, newPassword: string): Promise<boolean> {
    if (!rawToken || typeof rawToken !== "string" || !rawToken.trim()) {
      throw ApiError.badRequest("Reset token is missing.");
    }

    const hashedToken = this.hashToken(rawToken.trim());

    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw ApiError.badRequest("Invalid or expired password reset link.");
    }

    if (new Date() > tokenRecord.expiresAt) {
      await prisma.passwordResetToken.delete({ where: { id: tokenRecord.id } }).catch(() => {});
      throw ApiError.badRequest("Password reset link has expired. Please request a new one.");
    }

    // Hash new password using bcrypt
    const hashedPassword = await hashPassword(newPassword);

    // Update user password & delete used token (one-time use)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { userId: tokenRecord.userId },
      }),
    ]);

    return true;
  }
}
