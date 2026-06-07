import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import { query } from "./db.js";

declare module "express-session" {
  interface SessionData {
    adminUserId?: string;
  }
}

type AdminUser = {
  id: string;
  username: string;
  password_hash: string;
};

export async function verifyAdmin(username: string, password: string) {
  const result = await query<AdminUser>(
    "SELECT id, username, password_hash FROM admin_users WHERE username = $1 LIMIT 1",
    [username]
  );

  const user = result.rows[0];
  if (!user) return null;

  const ok = await bcrypt.compare(password, user.password_hash);
  return ok ? { id: user.id, username: user.username } : null;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.adminUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}
