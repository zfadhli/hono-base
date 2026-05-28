import type { Context } from "hono";
import { verifyJwt } from "../lib/jwt.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export async function auth(c: Context, next: () => Promise<void>) {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = header.slice(7);
  let payload: { sub: number; email: string; name: string };

  try {
    payload = await verifyJwt(token);
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const [user] = await db.select().from(users).where(eq(users.id, payload.sub));
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  c.set("user", user);
  await next();
}
