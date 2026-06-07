import crypto from "node:crypto";
import type { Request } from "express";
import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." }
});

export const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false
});

export function getClientIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() || req.ip;
  }
  return req.ip;
}

export function hashIp(ip: string | undefined) {
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip).digest("hex");
}

export function toCsvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}
