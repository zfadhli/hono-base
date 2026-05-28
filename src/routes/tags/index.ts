import { eq } from "drizzle-orm";
import { db } from "@/db/index";
import { tags } from "@/db/schema";
import { define, pagination } from "@/lib/scalar-docs";
import { ErrorRes, SuccessRes } from "@/validators/common";
import { CreateTag, TagQuery, PaginatedTags, TagRes } from "./schema.js";

const r = define.in("/api/tags");

r.get("", "List paginated tags")
  .query(TagQuery)
  .tag("Tags")
  .response(200, "Paginated list of tags", PaginatedTags)
  .handle(async (c, { query }) => {
    const result = await pagination(query)
      .from(db.query.tags, tags)
      .sortable({ name: tags.name })
      .execute();

    return c.json(result);
  });

r.post("", "Create a new tag")
  .auth()
  .json(CreateTag)
  .tag("Tags")
  .response(201, "Created tag", TagRes)
  .response(401, "Unauthorized", ErrorRes)
  .handle(async (c, { json }) => {
    const [tag] = await db.insert(tags).values(json).returning();
    if (!tag) return c.json({ error: "Failed to create" }, 500);
    return c.json({ data: tag }, 201);
  });

r.delete("/:id", "Delete a tag")
  .auth()
  .exists("id", tags)
  .tag("Tags")
  .response(200, "Deleted tag", SuccessRes)
  .response(401, "Unauthorized", ErrorRes)
  .handle(async (c, { id }) => {
    await db.delete(tags).where(eq(tags.id, id.id));
    return c.json({ success: true });
  });
