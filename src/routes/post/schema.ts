import { type } from "arktype";

export const CreatePost = type({
  title: "string >= 3",
  slug: "string",
  content: "string >= 10",
  "excerpt?": "string",
  "published?": "boolean",
  "tagIds?": "number[]",
});
export type CreatePost = typeof CreatePost.infer;

export const UpdatePost = type({
  "title?": "string >= 3",
  "slug?": "string",
  "content?": "string >= 10",
  "excerpt?": "string",
  "published?": "boolean",
  "tagIds?": "number[]",
});
export type UpdatePost = typeof UpdatePost.infer;

export const PostQuery = type({
  "offset?": "string",
  "limit?": "string",
  "q?": "string",
  "tag?": "string",
  "authorId?": "string",
  "published?": "string",
  "sort?": "'createdAt' | 'title'",
  "order?": "'asc' | 'desc'",
});
export type PostQuery = typeof PostQuery.infer;

const TagInPost = type({ id: "number", name: "string", slug: "string" });

export const Post = type({
  id: "number",
  title: "string",
  slug: "string",
  content: "string",
  "excerpt?": "string",
  published: "boolean",
  authorId: "number",
  createdAt: "string",
  updatedAt: "string",
  tags: TagInPost.array(),
  likeCount: "number",
});

export const PaginatedPosts = type({
  data: Post.array(),
  total: "number",
  offset: "number",
  limit: "number",
});

export const PostRes = type({ data: Post });
