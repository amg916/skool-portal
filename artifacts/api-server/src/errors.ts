import { Request, Response, NextFunction } from "express";
import { logger } from "./lib/logger.js";

export function apiError(
  res: Response,
  status: number,
  message: string,
  details?: unknown
) {
  const body: Record<string, unknown> = { error: message };
  if (details !== undefined) body.details = details;
  res.status(status).json(body);
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const message = err instanceof Error ? err.message : "Internal server error";
  logger.error({ err, url: req.url, method: req.method }, "Unhandled error");
  if (!res.headersSent) {
    res.status(500).json({ error: message });
  }
}
