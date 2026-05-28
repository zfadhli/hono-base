import { type } from "arktype";

export const CreateTag = type({
  name: "string >= 1",
  slug: "string",
});
export type CreateTag = typeof CreateTag.infer;

export const TagQuery = type({
  "offset?": "string",
  "limit?": "string",
  "sort?": "'name'",
  "order?": "'asc' | 'desc'",
});
export type TagQuery = typeof TagQuery.infer;
