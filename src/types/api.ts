export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T | null;
  error?: unknown;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorDetails?: unknown;

  constructor(message: string, statusCode: number = 500, errorDetails?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errorDetails = errorDetails;

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  static badRequest(message: string = "Bad Request", errorDetails?: unknown): ApiError {
    return new ApiError(message, 400, errorDetails);
  }

  static unauthorized(message: string = "Unauthorized access"): ApiError {
    return new ApiError(message, 401);
  }

  static forbidden(message: string = "Forbidden access"): ApiError {
    return new ApiError(message, 403);
  }

  static notFound(message: string = "Resource not found"): ApiError {
    return new ApiError(message, 404);
  }

  static conflict(message: string = "Resource conflict"): ApiError {
    return new ApiError(message, 409);
  }

  static internal(message: string = "Internal server error"): ApiError {
    return new ApiError(message, 500);
  }
}
