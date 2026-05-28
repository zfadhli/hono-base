import { type } from "arktype";

export const CreateTag = type({
  name: "string >= 1",
  slug: "string",
});
export type CreateTag = typeof CreateTag.infer;
