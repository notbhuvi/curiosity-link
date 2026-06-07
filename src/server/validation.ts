import { z } from "zod";

export const visitSchema = z.object({
  visitorId: z.string().min(16).max(128),
  screenResolution: z.string().min(3).max(32),
  language: z.string().min(2).max(64),
  referrer: z.string().url().max(2048).optional().or(z.literal(""))
});

export const loginSchema = z.object({
  username: z.string().min(1).max(80),
  password: z.string().min(1).max(200)
});

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color");

export const settingsSchema = z.object({
  landingText: z.string().min(20).max(5000),
  buttonText: z.string().min(1).max(80),
  primaryColor: hexColor,
  accentColor: hexColor,
  backgroundColor: hexColor
});
