import { eq, desc, count } from "drizzle-orm";
import { db } from "@/db/index";
import { comments, posts } from "@/db/schema";
import { define } from "@/lib/scalar-docs";
import { PostIdParam } from "@/validators/common";
import { CreateComment } from "./schema.js";

const r = define.in("/api/posts/:postId/comments");

r.get("", "List comments for a post")
  .param(PostIdParam)
  .exists("postId", posts)
  .tag("Comments")
  .response(200, "List of comments")
  .handle(async (c, { param }) => {
    const { postId } = param;
    const rows = await db.query.comments.findMany({
      where: eq(comments.postId, postId),
      orderBy: [desc(comments.createdAt)],
    });
    const [totalRow] = await db.select({ total: count() }).from(comments).where(eq(comments.postId, postId));
    return c.json({ data: rows, total: totalRow!.total });
  });

r.post("", "Create a comment on a post")
  .auth()
  .param(PostIdParam)
  .exists("postId", posts)
  .json(CreateComment)
  .tag("Comments")
  .response(201, "Created comment")
  .response(401, "Unauthorized")
  .handle(async (c, { param, json }) => {
    const user = (c.get as (k: string) => { id: number; name: string; email: string })("user");
    const { postId } = param;

    const [comment] = await db.insert(comments).values({
      postId,
      userId: user.id,
      authorName: user.name,
      authorEmail: user.email,
      content: json.content,
    }).returning();

    return c.json({ data: comment }, 201);
  });

r.delete("/:id", "Delete a comment")
  .auth()
  .tag("Comments")
  .response(200, "Deleted comment")
  .response(401, "Unauthorized")
  .response(404, "Comment not found")
  .handle(async (c) => {
    const user = (c.get as (k: string) => { id: number })("user");
    const id = Number(c.req.param("id")!);
    const [existing] = await db.select({ id: comments.id, userId: comments.userId }).from(comments).where(eq(comments.id, id));
    if (!existing) return c.json({ error: "Not found" }, 404);
    if (existing.userId !== user.id) return c.json({ error: "Forbidden" }, 403);
    await db.delete(comments).where(eq(comments.id, id));
    return c.json({ success: true });
  });
