import { Hono } from "hono";

// Hono context variable types for authenticated routes
export type AppVariables = {
  userId: string;
  email: string;
};

/**
 * Create a typed Hono instance with our app variables.
 * Use this in all route files that access c.get("userId").
 */
export function createRouter() {
  return new Hono<{ Variables: AppVariables }>();
}
