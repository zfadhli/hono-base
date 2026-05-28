import { type } from "arktype";
import { eq, and, count } from "drizzle-orm";
import { db } from "@/db/index";
import { postLikes, posts, users } from "@/db/schema";
import { define } from "@/lib/scalar-docs";
import { PostIdParam, ErrorRes } from "@/validators/common";

const r = define.in("/api/posts/:postId/likes");

r.get("", "Get likes for a post")
  .param(PostIdParam)
  .exists("postId", posts)
  .tag("Likes")
  .response(200, "Like count and list of users", type({ count: "number", users: type({ id: "number", name: "string" }).array() }))
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

r.post("", "Toggle like on a post")
  .auth()
  .param(PostIdParam)
  .exists("postId", posts)
  .tag("Likes")
  .response(200, "Toggled like status", type({ liked: "boolean", likeCount: "number" }))
  .response(401, "Unauthorized", ErrorRes)
  .handle(async (c, { param, user }) => {
    const { postId } = param;

    const [existing] = await db
      .select({ id: postLikes.id })
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, user.id)));

    if (existing) {
      await db.delete(postLikes).where(eq(postLikes.id, existing.id));
    } else {
      await db.insert(postLikes).values({ postId, userId: user.id });
    }

    const [totalRow] = await db.select({ count: count() }).from(postLikes).where(eq(postLikes.postId, postId));

    return c.json({ liked: !existing, likeCount: totalRow!.count });
  });
