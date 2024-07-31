import { eq, and, asc, or, desc } from "drizzle-orm";
import { db } from "../db/client.server";
import { chatMessages } from "../db/schema";

export type Message = typeof chatMessages.$inferSelect;
export type MessageInsert = typeof chatMessages.$inferInsert;

export function createMessage({ message, author, ownerId, parentChatId }: MessageInsert) {
  return db.insert(chatMessages).values({
    author,
    message,
    ownerId,
    parentChatId,
  });
}

export function listMessages(parentChatId: string, userId: string, options: { limit?: number, order?: "asc" | "desc"} = { order: "asc" }) {
  return db.query.chatMessages.findMany({
    where: and(
      eq(chatMessages.parentChatId, parentChatId),
      or(eq(chatMessages.ownerId, userId), eq(chatMessages.ownerId, "open-ai"))
    ),
    orderBy: options.order === "asc" ?  asc(chatMessages.createdAt) : desc(chatMessages.createdAt),
    limit: options.limit,
  });
}
