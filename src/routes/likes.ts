import { eq, and, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { postLikes, posts, users } from "../db/schema.js";
import { define } from "../lib/scalar-docs.js";
import { PostIdParam, ToggleLike } from "../validators/schemas.js";

define.get("/api/posts/:postId/likes", "Get likes for a post")
  .param(PostIdParam)
  .exists("postId", posts)
  .tag("Likes")
  .response(200, "Like count and list of users")
  .handle(async (c, { param }) => {
    const { postId } = param;

    const [totalRow] = await db.select({ count: count() }).from(postLikes).where(eq(postLikes.postId, postId));
    const total = totalRow!.count;

    const rows = await db
      .select({ id: users.id, name: users.name })
      .from(postLikes)
      .innerJoin(users, eq(postLikes.userId, users.id))
      .where(eq(postLikes.postId, postId));

    return c.json({ count: total, users: rows });
  });

define.post("/api/posts/:postId/likes", "Toggle like on a post")
  .param(PostIdParam)
  .exists("postId", posts)
  .json(ToggleLike)
  .tag("Likes")
  .response(200, "Toggled like status")
  .handle(async (c, { param, json }) => {
    const { postId } = param;
    const { userId } = json;

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
    if (!user) return c.json({ error: "User not found" }, 404);

    const [existing] = await db
      .select({ id: postLikes.id })
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));

    if (existing) {
      await db.delete(postLikes).where(eq(postLikes.id, existing.id));
    } else {
      await db.insert(postLikes).values({ postId, userId });
    }

    const [totalRow] = await db.select({ count: count() }).from(postLikes).where(eq(postLikes.postId, postId));

    return c.json({ liked: !existing, likeCount: totalRow!.count });
  });
