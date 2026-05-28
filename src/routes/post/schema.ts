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

export const Pagination = type({
  "offset?": "string",
  "limit?": "string",
});
export type Pagination = typeof Pagination.infer;
