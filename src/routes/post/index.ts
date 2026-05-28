import { eq, sql, like, or } from "drizzle-orm";
import { db } from "@/db/index";
import { posts, postsTags, tags } from "@/db/schema";
import { define, pagination } from "@/lib/scalar-docs";
import { CreatePost, UpdatePost, PostQuery } from "./schema.js";

function formatPost(row: any) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    excerpt: row.excerpt,
    published: row.published,
    authorId: row.authorId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tags: row.postsTags.map((pt: any) => pt.tag),
    likeCount: row.postLikes.length,
  };
}

const r = define.in("/api/posts");

r.get("", "List paginated posts")
  .query(PostQuery)
  .tag("Posts")
  .response(200, "Paginated list of posts")
  .handle(async (c, { query }) => {
    const result = await pagination(query)
      .from(db.query.posts, posts)
      .filters({
        q: (v) => or(like(posts.title, `%${v}%`), like(posts.content, `%${v}%`)),
        tag: (v) => sql`exists (select 1 from ${postsTags} pt join ${tags} t on pt.tag_id = t.id where pt.post_id = ${posts.id} and t.slug = ${v})`,
        authorId: (v) => eq(posts.authorId, Number(v)),
        published: (v) => eq(posts.published, v === "true"),
      })
      .sortable({ createdAt: posts.createdAt, title: posts.title })
      .with({ postsTags: { with: { tag: true } }, postLikes: true })
      .execute();

    return c.json({ data: result.data.map(formatPost), total: result.total, offset: result.offset, limit: result.limit });
  });

r.get("/:slug", "Get a single post by slug")
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

    return c.json({ data: formatPost(row) });
  });

r.post("", "Create a new post")
  .auth()
  .json(CreatePost)
  .tag("Posts")
  .response(201, "Created post")
  .response(401, "Unauthorized")
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
  .response(200, "Updated post")
  .response(401, "Unauthorized")
  .response(403, "Forbidden")
  .response(404, "Post not found")
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
  .response(200, "Deleted post")
  .response(401, "Unauthorized")
  .response(403, "Forbidden")
  .response(404, "Post not found")
  .handle(async (c, { id }) => {
    await db.delete(posts).where(eq(posts.id, id.id));
    return c.json({ success: true });
  });
