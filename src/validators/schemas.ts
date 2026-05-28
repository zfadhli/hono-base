import { type } from "arktype";

export const NumId = type("string").pipe((s, ctx) => {
  const n = Number(s);
  if (isNaN(n)) return ctx.reject("Must be a numeric string") as never;
  return n;
});
export type NumId = typeof NumId.infer;

export const IdParam = type({ id: NumId });
export const PostIdParam = type({ postId: NumId });

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

export const CreateTag = type({
  name: "string >= 1",
  slug: "string",
});
export type CreateTag = typeof CreateTag.infer;

export const CreateComment = type({
  content: "string >= 1",
});
export type CreateComment = typeof CreateComment.infer;

export const ToggleLike = type({ userId: "number" });
export type ToggleLike = typeof ToggleLike.infer;

export const Pagination = type({
  "offset?": "string",
  "limit?": "string",
});
export type Pagination = typeof Pagination.infer;

export const CodeParam = type({ code: "string" });
export type CodeParam = typeof CodeParam.infer;
