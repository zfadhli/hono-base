import { eq, desc, sql, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { posts, postsTags, tags } from "../db/schema.js";
import { define } from "../lib/scalar-docs.js";
import { CreatePost, UpdatePost, Pagination } from "../validators/schemas.js";

define.get("/api/posts", "List paginated posts")
  .query(Pagination)
  .tag("Posts")
  .response(200, "Paginated list of posts")
  .handle(async (c, { query }) => {
    const offset = Number(query.offset ?? 0);
    const limit = Number(query.limit ?? 20);

    const rows = await db.query.posts.findMany({
      limit,
      offset,
      orderBy: [desc(posts.createdAt)],
      with: { postsTags: { with: { tag: true } }, postLikes: true },
    });

    const [totalRow] = await db.select({ total: count() }).from(posts);
    const total = totalRow!.total;

    const data = rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      content: row.content,
      excerpt: row.excerpt,
      published: row.published,
      authorId: row.authorId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      tags: row.postsTags.map((pt) => pt.tag),
      likeCount: row.postLikes.length,
    }));

    return c.json({ data, total, offset, limit });
  });

define.get("/api/posts/:slug", "Get a single post by slug")
  .tag("Posts")
  .response(200, "A single post with tags")
  .response(404, "Post not found")
  .handle(async (c) => {
    const slug = c.req.param("slug")!;

    const row = await db.query.posts.findFirst({
      where: eq(posts.slug, slug),
      with: { postsTags: { with: { tag: true } }, postLikes: true },
    });

    if (!row) return c.json({ error: "Not found" }, 404);

    return c.json({
      data: {
        id: row.id,
        title: row.title,
        slug: row.slug,
        content: row.content,
        excerpt: row.excerpt,
        published: row.published,
        authorId: row.authorId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        tags: row.postsTags.map((pt) => pt.tag),
        likeCount: row.postLikes.length,
      },
    });
  });

define.post("/api/posts", "Create a new post")
  .json(CreatePost)
  .tag("Posts")
  .response(201, "Created post")
  .handle(async (c, { json }) => {
    const { tagIds, ...postFields } = json;

    const [post] = await db.insert(posts).values(postFields).returning();
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

define.patch("/api/posts/:id", "Update an existing post")
  .exists("id", posts)
  .json(UpdatePost)
  .tag("Posts")
  .response(200, "Updated post")
  .response(404, "Post not found")
  .handle(async (c, { json }) => {
    const id = (c.get as (k: string) => { id: number })("id").id;
    const { tagIds, ...postFields } = json;

    if (Object.keys(postFields).length > 0) {
      const [post] = await db
        .update(posts)
        .set({ ...postFields, updatedAt: sql`(current_timestamp)` })
        .where(eq(posts.id, id))
        .returning();
      if (!post) return c.json({ error: "Not found" }, 404);
    }

    if (tagIds !== undefined) {
      await db.delete(postsTags).where(eq(postsTags.postId, id));
      if (tagIds.length > 0) {
        const existingTags = await db.select({ id: tags.id }).from(tags).where(sql`${tags.id} IN ${tagIds}`);
        const validIds = existingTags.map((t) => t.id);
        if (validIds.length > 0) {
          await db.insert(postsTags).values(validIds.map((tagId) => ({ postId: id, tagId })));
        }
      }
    }

    const updated = await db.query.posts.findFirst({
      where: eq(posts.id, id),
      with: { postsTags: { with: { tag: true } }, postLikes: true },
    });

    return c.json({
      data: updated
        ? {
            id: updated.id,
            title: updated.title,
            slug: updated.slug,
            content: updated.content,
            excerpt: updated.excerpt,
            published: updated.published,
            authorId: updated.authorId,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
            tags: updated.postsTags.map((pt) => pt.tag),
            likeCount: updated.postLikes.length,
          }
        : updated,
    });
  });

define.delete("/api/posts/:id", "Delete a post")
  .exists("id", posts)
  .tag("Posts")
  .response(200, "Deleted post")
  .handle(async (c) => {
    const id = (c.get as (k: string) => { id: number })("id").id;
    await db.delete(posts).where(eq(posts.id, id));
    return c.json({ success: true });
  });
