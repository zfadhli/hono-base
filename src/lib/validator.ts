import { validator } from "hono/validator";
import type { StandardSchemaV1 } from "@standard-schema/spec";

type Source = "json" | "query" | "param";

export function validate(source: Source, schema: StandardSchemaV1) {
  return validator(source, async (value: unknown, c) => {
    const result = await schema["~standard"].validate(value);
    if (result.issues) {
      return c.json({
        error: "Validation failed",
        issues: result.issues.map((issue: any) => ({
          path: Array.isArray(issue.path) ? issue.path.join(".") : "",
          message: issue.message,
        })),
      }, 400);
    }
    return result.value;
  });
}
