import type { Context } from "hono";
import { verifyAccessToken } from "@/lib/jwt";
import { db } from "@/db/index";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function auth(c: Context, next: () => Promise<void>) {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = header.slice(7);
  let payload: { sub: number; email: string; name: string };

  try {
    payload = await verifyAccessToken(token);
  } catch (e) {
    if ((e as any).code === "ERR_JWT_EXPIRED") {
      return c.json({ error: "Token expired" }, 401);
    }
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const [user] = await db.select().from(users).where(eq(users.id, payload.sub));
  if (!user) {
    return c.json({ error: "User not found" }, 401);
  }

  c.set("user", user);
  await next();
}
