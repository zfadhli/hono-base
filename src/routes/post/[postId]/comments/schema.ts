import { type } from "arktype";

export const CreateComment = type({
  content: "string >= 1",
});
export type CreateComment = typeof CreateComment.infer;

export const CommentQuery = type({
  "offset?": "string",
  "limit?": "string",
  "sort?": "'createdAt'",
  "order?": "'asc' | 'desc'",
});
export type CommentQuery = typeof CommentQuery.infer;
