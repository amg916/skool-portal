import { Request, Response, NextFunction } from "express";
import { getSessionByToken } from "../storage/sessions.js";
import { getUserById } from "../storage/users.js";
import type { User } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionToken?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.session_token;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const session = await getSessionByToken(token);
  if (!session) {
    res.status(401).json({ error: "Session expired" });
    return;
  }
  const user = await getUserById(session.userId);
  if (!user || !user.isActive) {
    res.status(401).json({ error: "User not found or inactive" });
    return;
  }
  req.user = user;
  req.sessionToken = token;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
