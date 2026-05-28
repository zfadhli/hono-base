import { eq, desc } from "drizzle-orm";
import { db } from "@/db/index";
import { comments, posts } from "@/db/schema";
import { define, pagination } from "@/lib/scalar-docs";
import { PostIdParam } from "@/validators/common";
import { CreateComment, CommentQuery } from "./schema.js";

const r = define.in("/api/posts/:postId/comments");

r.get("", "List paginated comments for a post")
  .param(PostIdParam)
  .exists("postId", posts)
  .query(CommentQuery)
  .tag("Comments")
  .response(200, "Paginated list of comments")
  .handle(async (c, { query }) => {
    const postId = Number(c.req.param("postId")!);
    const result = await pagination(query)
      .from(db.query.comments, comments)
      .where(eq(comments.postId, postId))
      .orderBy([desc(comments.createdAt)])
      .execute();

    return c.json(result);
  });

r.post("", "Create a comment on a post")
  .auth()
  .param(PostIdParam)
  .exists("postId", posts)
  .json(CreateComment)
  .tag("Comments")
  .response(201, "Created comment")
  .response(401, "Unauthorized")
  .handle(async (c, { param, json, user }) => {
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
  .exists("id", comments, { owner: "userId" })
  .tag("Comments")
  .response(200, "Deleted comment")
  .response(401, "Unauthorized")
  .response(403, "Forbidden")
  .response(404, "Comment not found")
  .handle(async (c, { id }) => {
    await db.delete(comments).where(eq(comments.id, id.id));
    return c.json({ success: true });
  });
