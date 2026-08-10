import { Response } from "express";
import { ZodError } from "zod";
import { ApiError, ApiResponse } from "@/types/api";

/**
 * Returns a standardized success HTTP response in Express.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message: string = "Operation successful",
  statusCode: number = 200
): Response {
  const payload: ApiResponse<T> = {
    success: true,
    message,
    data,
    error: null,
  };
  return res.status(statusCode).json(payload);
}

/**
 * Returns a standardized error HTTP response in Express.
 */
export function sendError(
  res: Response,
  message: string = "An error occurred",
  statusCode: number = 500,
  errorDetails: unknown = null
): Response {
  const payload: ApiResponse<null> = {
    success: false,
    message,
    data: null,
    error: errorDetails,
  };
  return res.status(statusCode).json(payload);
}

/**
 * Handles caught errors uniformly across Express route controllers.
 */
export function handleApiError(res: Response, error: unknown): Response {
  if (error instanceof ApiError) {
    return sendError(res, error.message, error.statusCode, error.errorDetails);
  }

  if (error instanceof ZodError) {
    const formattedErrors = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return sendError(res, "Validation error", 400, formattedErrors);
  }

  if (error instanceof SyntaxError) {
    return sendError(res, "Invalid or empty JSON request body", 400);
  }

  console.error("Unhandled API Error:", error);
  const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
  return sendError(res, errorMessage, 500);
}
