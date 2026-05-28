import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { tags } from "../db/schema.js";
import { define } from "../lib/scalar-docs.js";
import { CreateTag } from "../validators/schemas.js";

define.get("/api/tags", "List all tags")
  .tag("Tags")
  .response(200, "List of tags")
  .handle(async (c) => {
    const all = await db.query.tags.findMany({ orderBy: tags.name });
    return c.json({ data: all });
  });

define.post("/api/tags", "Create a new tag")
  .json(CreateTag)
  .tag("Tags")
  .response(201, "Created tag")
  .handle(async (c, { json }) => {
    const [tag] = await db.insert(tags).values(json).returning();
    if (!tag) return c.json({ error: "Failed to create" }, 500);
    return c.json({ data: tag }, 201);
  });

define.delete("/api/tags/:id", "Delete a tag")
  .exists("id", tags)
  .tag("Tags")
  .response(200, "Deleted tag")
  .handle(async (c) => {
    const id = (c.get as (k: string) => { id: number })("id").id;
    await db.delete(tags).where(eq(tags.id, id));
    return c.json({ success: true });
  });
