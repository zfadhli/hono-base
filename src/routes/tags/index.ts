import { eq } from "drizzle-orm";
import { db } from "@/db/index";
import { tags } from "@/db/schema";
import { define } from "@/lib/scalar-docs";
import { CreateTag } from "./schema.js";

const r = define.in("/api/tags");

r.get("", "List all tags")
  .tag("Tags")
  .response(200, "List of tags")
  .handle(async (c) => {
    const all = await db.query.tags.findMany({ orderBy: tags.name });
    return c.json({ data: all });
  });

r.post("", "Create a new tag")
  .auth()
  .json(CreateTag)
  .tag("Tags")
  .response(201, "Created tag")
  .response(401, "Unauthorized")
  .handle(async (c, { json }) => {
    const [tag] = await db.insert(tags).values(json).returning();
    if (!tag) return c.json({ error: "Failed to create" }, 500);
    return c.json({ data: tag }, 201);
  });

r.delete("/:id", "Delete a tag")
  .auth()
  .exists("id", tags)
  .tag("Tags")
  .response(200, "Deleted tag")
  .response(401, "Unauthorized")
  .handle(async (c, { id }) => {
    await db.delete(tags).where(eq(tags.id, id.id));
    return c.json({ success: true });
  });
