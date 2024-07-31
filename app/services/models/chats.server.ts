import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.server";
import { chatMessages, chats } from "../db/schema";

export type Chat = typeof chats.$inferSelect;
export type CharInsert = typeof chats.$inferInsert;

export function getChats(userId: string) {
  return db.query.chats.findMany({
    limit: 10,
    where: eq(chats.ownerId, userId),
    orderBy: desc(chats.createdAt),
    with: {
      messages: {
        limit: 1,
      },
    },
  });
}

export async function createChat(ownerId: string) {
  return db
    .insert(chats)
    .values({
      llmId: "open-ai",
      ownerId,
    })
    .returning({ id: chats.id });
}

export async function getUserChat(userId: string, chatId: string) {
  return db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.ownerId, userId)),
    with: {
      messages: {
        orderBy: desc(chatMessages.createdAt),
        limit: 10,
      },
    },
  });
}

export function updateChat(chatId: string, update: Partial<CharInsert>) {
  return db
    .update(chats)
    .set(update)
    .where(and(eq(chats.id, chatId), sql`${chats.title} IS NULL OR ${chats.title} = ''`));
}
