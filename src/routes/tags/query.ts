import { tags } from "@/db/schema";
import { queryBuilder } from "@/lib/query-builder";

export const tagsQueryBuilder = queryBuilder()
  .allowedSorts({
    name: tags.name,
  })
  .defaultSort("name")
  .allowedFields({
    id: true,
    name: true,
    slug: true,
    createdAt: true,
  });
