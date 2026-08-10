import { Request, Response, NextFunction } from "express";
import { handleApiError } from "../utils/api-response";

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  handleApiError(res, err);
}
