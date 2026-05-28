import { sql, like, or, exists, and, eq } from "drizzle-orm";
import { db } from "@/db/index";
import { posts, postsTags, tags } from "@/db/schema";
import { queryBuilder } from "@/lib/query-builder";

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
    tags: row.postsTags ? row.postsTags.map((pt: any) => pt.tag) : [],
    likeCount: row.postLikes ? row.postLikes.length : 0,
  };
}

export { formatPost };

export const postQueryBuilder = queryBuilder()
  .allowedFilters({
    q: (v) => or(like(posts.title, `%${v}%`), like(posts.content, `%${v}%`)),
    tag: (v) => exists(
      db.select({ one: sql`1` })
        .from(postsTags)
        .innerJoin(tags, eq(postsTags.tagId, tags.id))
        .where(and(
          eq(postsTags.postId, posts.id),
          eq(tags.slug, v),
        ))
    ),
    authorId: (v) => eq(posts.authorId, Number(v)),
    published: (v) => eq(posts.published, v === "true"),
  })
  .allowedSorts({
    createdAt: posts.createdAt,
    title: posts.title,
  })
  .allowedIncludes({
    postsTags: { with: { tag: true } },
    postLikes: true,
  })
  .allowedFields({
    id: true,
    title: true,
    slug: true,
    content: true,
    excerpt: true,
    published: true,
    authorId: true,
    createdAt: true,
    updatedAt: true,
    tags: true,
    likeCount: true,
  })
  .transform(formatPost);
