import { type } from "arktype";

export const CreateComment = type({
  content: "string >= 1",
});
export type CreateComment = typeof CreateComment.infer;
