import { eq, desc } from "drizzle-orm";
import { db } from "@/db/index";
import { comments, posts } from "@/db/schema";
import { define } from "@/lib/scalar-docs";
import { PostIdParam, ErrorRes, SuccessRes } from "@/validators/common";
import { CreateComment, PaginatedComments, CommentRes } from "./schema.js";
import { commentsQueryBuilder } from "./query.js";

const r = define.in("/api/posts/:postId/comments");

r.get("", "List paginated comments for a post")
  .param(PostIdParam)
  .exists("postId", posts)
  .use(commentsQueryBuilder)
  .tag("Comments")
  .response(200, "Paginated list of comments", PaginatedComments)
  .handle(async (c, { query }) => {
    const postId = Number(c.req.param("postId")!);
    const result = await commentsQueryBuilder.execute(db.query.comments, comments, query, {
      where: eq(comments.postId, postId),
      orderBy: [desc(comments.createdAt)],
    });

    return c.json(result);
  });

r.post("", "Create a comment on a post")
  .auth()
  .param(PostIdParam)
  .exists("postId", posts)
  .json(CreateComment)
  .tag("Comments")
  .response(201, "Created comment", CommentRes)
  .response(401, "Unauthorized", ErrorRes)
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
  .response(200, "Deleted comment", SuccessRes)
  .response(401, "Unauthorized", ErrorRes)
  .response(403, "Forbidden", ErrorRes)
  .response(404, "Comment not found", ErrorRes)
  .handle(async (c, { id }) => {
    await db.delete(comments).where(eq(comments.id, id.id));
    return c.json({ success: true });
  });
