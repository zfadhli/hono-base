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

export const Comment = type({
  id: "number",
  postId: "number",
  userId: "number",
  authorName: "string",
  authorEmail: "string",
  content: "string",
  createdAt: "string",
  updatedAt: "string",
});

export const PaginatedComments = type({
  data: Comment.array(),
  total: "number",
  offset: "number",
  limit: "number",
});

export const CommentRes = type({ data: Comment });
