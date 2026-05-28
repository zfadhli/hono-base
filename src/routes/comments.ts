import { eq, desc, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { comments, posts } from "../db/schema.js";
import { define } from "../lib/scalar-docs.js";
import { CreateComment, PostIdParam } from "../validators/schemas.js";

define.get("/api/posts/:postId/comments", "List comments for a post")
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

define.post("/api/posts/:postId/comments", "Create a comment on a post")
  .param(PostIdParam)
  .exists("postId", posts)
  .json(CreateComment)
  .tag("Comments")
  .response(201, "Created comment")
  .handle(async (c, { param, json }) => {
    const { postId } = param;

    const [comment] = await db.insert(comments).values({
      postId,
      authorName: json.authorName,
      authorEmail: json.authorEmail,
      content: json.content,
    }).returning();

    return c.json({ data: comment }, 201);
  });

define.delete("/api/posts/:postId/comments/:id", "Delete a comment")
  .tag("Comments")
  .response(200, "Deleted comment")
  .response(404, "Comment not found")
  .handle(async (c) => {
    const id = Number(c.req.param("id")!);
    const [comment] = await db.delete(comments).where(eq(comments.id, id)).returning({ id: comments.id });
    if (!comment) return c.json({ error: "Not found" }, 404);
    return c.json({ success: true });
  });
