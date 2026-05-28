import { type } from "arktype";

export const CodeParam = type({ code: "string" });
export type CodeParam = typeof CodeParam.infer;
