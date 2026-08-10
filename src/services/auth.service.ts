import { prisma } from "@/lib/prisma";
import { hashPassword, comparePassword } from "@/utils/password";
import { generateToken } from "@/utils/jwt";
import { ApiError } from "@/types/api";
import { AuthSuccessData, UserResponseDto, Role, CreatorVerificationStatus } from "@/types/auth";
import { RegisterInput, LoginInput } from "@/validators/auth";
import { NotificationService } from "@/services/notification.service";

export class AuthService {
  /**
   * Helper to format User model to sanitized UserResponseDto (excluding password).
   */
  private static formatUserDto(user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    profileImage?: string | null;
    bio?: string | null;
    verificationStatus?: CreatorVerificationStatus | null;
    rejectionReason?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage || null,
      avatar: user.profileImage || null,
      bio: user.bio || null,
      verificationStatus: user.verificationStatus ?? (user.role === Role.CREATOR ? CreatorVerificationStatus.PENDING : null),
      rejectionReason: user.rejectionReason || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Registers a new user.
   * Default role is STUDENT.
   */
  static async registerUser(input: RegisterInput): Promise<AuthSuccessData> {
    const email = input.email.toLowerCase().trim();

    // Check if user with given email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw ApiError.conflict("User with this email already exists");
    }

    // Hash plain text password using bcrypt
    const hashedPassword = await hashPassword(input.password);

    // Default role is STUDENT unless specified
    const role = input.role || Role.STUDENT;

    // Create user in database
    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        password: hashedPassword,
        role,
        ...(role === Role.CREATOR ? { verificationStatus: CreatorVerificationStatus.PENDING } : {}),
      },
    });

    // Generate signed JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Dispatch welcome notification and admin notification
    if (role === Role.CREATOR) {
      NotificationService.createNotification({
        recipientId: user.id,
        recipientRole: Role.CREATOR,
        title: "Welcome to Innonsh Edu Creators!",
        message: "Welcome! Start creating your first course and reach thousands of learners.",
        type: "WELCOME",
        link: "/creator/dashboard",
      });
      NotificationService.notifyAdmins(
        "New Creator Registered",
        `${user.name} registered as a creator and is awaiting verification.`,
        "NEW_CREATOR_REGISTERED",
        "/admin/creators"
      );
    } else {
      NotificationService.createNotification({
        recipientId: user.id,
        recipientRole: Role.STUDENT,
        title: "Welcome to Innonsh Edu!",
        message: "Welcome to Innonsh Edu! Explore thousands of courses and start learning today.",
        type: "WELCOME",
        link: "/student/dashboard",
      });
    }

    return {
      user: this.formatUserDto(user),
      token,
    };
  }

  /**
   * Authenticates a user with email and password.
   */
  static async loginUser(input: LoginInput): Promise<AuthSuccessData> {
    const email = input.email.toLowerCase().trim();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    // Compare input password against stored bcrypt hash
    const isPasswordValid = await comparePassword(input.password, user.password);

    if (!isPasswordValid) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    // Generate signed JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: this.formatUserDto(user),
      token,
    };
  }

  /**
   * Retrieves profile details for a given user ID.
   */
  static async getUserById(userId: string): Promise<UserResponseDto> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw ApiError.notFound("User profile not found");
    }

    return this.formatUserDto(user);
  }
}
