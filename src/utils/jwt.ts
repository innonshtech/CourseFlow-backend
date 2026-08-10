import jwt from "jsonwebtoken";
import { Response } from "express";
import { JwtPayload } from "@/types/auth";
import { ApiError } from "@/types/api";

const JWT_SECRET = process.env.JWT_SECRET || "your_secret";
const TOKEN_EXPIRY = "7d";
export const AUTH_COOKIE_NAME = "token";

/**
 * Generates a signed JWT containing user id, email, and role.
 */
export function generateToken(payload: JwtPayload): string {
  const secret = JWT_SECRET;
  if (!secret) {
    throw ApiError.internal("JWT Secret is not configured in environment");
  }

  const { id, email, role } = payload;

  return jwt.sign({ id, email, role }, secret, {
    expiresIn: TOKEN_EXPIRY,
  });
}

/**
 * Verifies a JWT and returns the decoded JwtPayload if valid.
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const secret = JWT_SECRET;
    if (!secret) return null;

    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Sets the JWT token in an HTTP-only, secure cookie in Express.
 */
export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });
}

/**
 * Removes the authentication cookie cleanly in Express.
 */
export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}
