import { Request, Response, NextFunction } from "express";
import { AUTH_COOKIE_NAME, verifyToken } from "@/utils/jwt";
import { ApiError } from "@/types/api";
import { Role } from "@/types/auth";
import { prisma } from "@/lib/prisma";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  let token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return next(ApiError.unauthorized("Authentication required. Please login."));
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return next(ApiError.unauthorized("Invalid or expired authentication token."));
  }

  req.user = decoded;
  next();
}

export function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  let token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}

export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized("Authentication required"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access denied. Requires one of the following roles: [${allowedRoles.join(", ")}]`
        )
      );
    }

    next();
  };
}

export const requireAdmin = [authenticate, requireRole([Role.ADMIN])];
export const requireCreator = [authenticate, requireRole([Role.CREATOR, Role.ADMIN])];
export const requireStudent = [authenticate, requireRole([Role.STUDENT, Role.ADMIN])];

export async function requireApprovedCreator(req: Request, res: Response, next: NextFunction) {
  authenticate(req, res, async (err) => {
    if (err) return next(err);
    if (!req.user) return next(ApiError.unauthorized("Authentication required"));

    if (req.user.role !== Role.CREATOR && req.user.role !== Role.ADMIN) {
      return next(ApiError.forbidden("Creator authorization required"));
    }

    if (req.user.role === Role.CREATOR) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { verificationStatus: true },
        });

        if (!user || user.verificationStatus !== "APPROVED") {
          return next(ApiError.forbidden("Your creator account is under review or not approved."));
        }
      } catch (error) {
        return next(error);
      }
    }

    next();
  });
}
