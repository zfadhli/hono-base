import { eq, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { posts, postsTags, tags } from "@/db/schema";
import { define } from "@/lib/scalar-docs";
import { ErrorRes, SuccessRes } from "@/validators/common";
import { CreatePost, UpdatePost, PaginatedPosts, PostRes } from "./schema.js";
import { postQueryBuilder, formatPost } from "./query.js";

const r = define.in("/api/posts");

r.get("", "List paginated posts")
  .use(postQueryBuilder)
  .tag("Posts")
  .response(200, "Paginated list of posts", PaginatedPosts)
  .handle(async (c, { query }) => {
    const result = await postQueryBuilder.execute(db.query.posts, posts, query);
    return c.json(result);
  });

r.get("/:slug", "Get a single post by slug")
  .tag("Posts")
  .response(200, "A single post with tags", PostRes)
  .response(404, "Post not found", ErrorRes)
  .handle(async (c) => {
    const slug = c.req.param("slug")!;

    const row = await db.query.posts.findFirst({
      where: eq(posts.slug, slug),
      with: { postsTags: { with: { tag: true } }, postLikes: true },
    });

    if (!row) return c.json({ error: "Not found" }, 404);

    return c.json({ data: formatPost(row) });
  });

r.post("", "Create a new post")
  .auth()
  .json(CreatePost)
  .tag("Posts")
  .response(201, "Created post", PostRes)
  .response(401, "Unauthorized", ErrorRes)
  .handle(async (c, { json, user }) => {
    const { tagIds, ...postFields } = json;

    const [post] = await db.insert(posts).values({ ...postFields, authorId: user.id }).returning();
    if (!post) return c.json({ error: "Failed to create" }, 500);

    if (tagIds && tagIds.length > 0) {
      const existingTags = await db.select({ id: tags.id }).from(tags).where(sql`${tags.id} IN ${tagIds}`);
      const validIds = existingTags.map((t) => t.id);
      if (validIds.length > 0) {
        await db.insert(postsTags).values(validIds.map((tagId) => ({ postId: post.id, tagId })));
      }
    }

    return c.json({ data: post }, 201);
  });

r.patch("/:id", "Update an existing post")
  .auth()
  .exists("id", posts, { owner: "authorId" })
  .json(UpdatePost)
  .tag("Posts")
  .response(200, "Updated post", PostRes)
  .response(401, "Unauthorized", ErrorRes)
  .response(403, "Forbidden", ErrorRes)
  .response(404, "Post not found", ErrorRes)
  .handle(async (c, { json, id }) => {
    const { tagIds, ...postFields } = json;

    if (Object.keys(postFields).length > 0) {
      const [updatedPost] = await db
        .update(posts)
        .set({ ...postFields, updatedAt: sql`(current_timestamp)` })
        .where(eq(posts.id, id.id))
        .returning();
      if (!updatedPost) return c.json({ error: "Not found" }, 404);
    }

    if (tagIds !== undefined) {
      await db.delete(postsTags).where(eq(postsTags.postId, id.id));
      if (tagIds.length > 0) {
        const existingTags = await db.select({ id: tags.id }).from(tags).where(sql`${tags.id} IN ${tagIds}`);
        const validIds = existingTags.map((t) => t.id);
        if (validIds.length > 0) {
          await db.insert(postsTags).values(validIds.map((tagId) => ({ postId: id.id, tagId })));
        }
      }
    }

    const updated = await db.query.posts.findFirst({
      where: eq(posts.id, id.id),
      with: { postsTags: { with: { tag: true } }, postLikes: true },
    });

    return c.json({ data: updated ? formatPost(updated) : updated });
  });

r.delete("/:id", "Delete a post")
  .auth()
  .exists("id", posts, { owner: "authorId" })
  .tag("Posts")
  .response(200, "Deleted post", SuccessRes)
  .response(401, "Unauthorized", ErrorRes)
  .response(403, "Forbidden", ErrorRes)
  .response(404, "Post not found", ErrorRes)
  .handle(async (c, { id }) => {
    await db.delete(posts).where(eq(posts.id, id.id));
    return c.json({ success: true });
  });
