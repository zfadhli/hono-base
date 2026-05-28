import { comments } from "@/db/schema";
import { queryBuilder } from "@/lib/query-builder";

export const commentsQueryBuilder = queryBuilder()
  .allowedSorts({
    createdAt: comments.createdAt,
  })
  .defaultSort("-createdAt")
  .allowedFields({
    id: true,
    postId: true,
    userId: true,
    authorName: true,
    authorEmail: true,
    content: true,
    createdAt: true,
    updatedAt: true,
  });
