import { type } from "arktype";

export const NumId = type("string").pipe((s, ctx) => {
  const n = Number(s);
  if (isNaN(n)) return ctx.reject("Must be a numeric string") as never;
  return n;
});
export type NumId = typeof NumId.infer;

export const PostIdParam = type({ postId: NumId });
