import { customType, pgEnum, pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const customBytes = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
  fromDriver(value: unknown) {
    if (Buffer.isBuffer(value)) return value;
    throw new Error("Expected Buffer");
  },
  toDriver(value: Buffer) {
    return value;
  },
});

export const messageAuthorEnum = pgEnum("MessageAuthor", ["user", "model"]);

export const documents = pgTable("Document", {
  id: text("id").primaryKey(),
  createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).defaultNow().notNull(),
  name: text("name").notNull(),
  nameSpace: text("nameSpace").notNull(),
});

export const contents = pgTable("Content", {
  id: text("id").primaryKey(),
  createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).defaultNow().notNull(),
  metadata: text("metadata").notNull(),
  pageContent: text("pageContent").notNull(),
  name: text("name").notNull(),
  documentId: text("documentId").notNull(),
});

export const users = pgTable("User", {
  id: text("id").primaryKey(),
  createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).defaultNow().notNull(),
  auth_subject: text("auth_subject"),
  display_name: text("display_name"),
  given_name: text("given_name"),
  family_name: text("family_name"),
  picture_url: text("picture_url"),
  locale: text("locale"),
  email: text("email"),
  email_verified: boolean("email_verified"),
  lastShownWarning: timestamp("lastShownWarning", { mode: "date", precision: 3 }),
});

export const llmInstances = pgTable("LLMInstance", {
  id: text("id").primaryKey(),
  createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).defaultNow().notNull(),
  name: text("name").notNull(),
});

export const chats = pgTable("Chat", {
  id: text("id").primaryKey(),
  createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).defaultNow().notNull(),
  ownerId: text("ownerId").notNull(),
  title: text("title"),
  llmId: text("llmId").notNull(),
});

export const chatMessages = pgTable("ChatMessage", {
  id: text("id").primaryKey(),
  createdAt: timestamp("createdAt", { mode: "date", precision: 3 }).defaultNow().notNull(),
  message: text("message").notNull(),
  ownerId: text("ownerId").notNull(),
  author: messageAuthorEnum("author").notNull(),
  parentChatId: text("parentChatId").notNull(),
});

export const documentsRelations = relations(documents, (helpers) => ({
  content: helpers.many(contents, { relationName: "ContentToDocument" }),
}));

export const contentsRelations = relations(contents, (helpers) => ({
  document: helpers.one(documents, {
    relationName: "ContentToDocument",
    fields: [contents.documentId],
    references: [documents.id],
  }),
}));

export const usersRelations = relations(users, (helpers) => ({
  Chat: helpers.many(chats, { relationName: "ChatToUser" }),
  ChatMessage: helpers.many(chatMessages, { relationName: "ChatMessageToUser" }),
}));

export const llmInstancesRelations = relations(llmInstances, (helpers) => ({
  chats: helpers.many(chats, { relationName: "ChatToLLMInstance" }),
}));

export const chatsRelations = relations(chats, (helpers) => ({
  owner: helpers.one(users, { relationName: "ChatToUser", fields: [chats.ownerId], references: [users.id] }),
  messages: helpers.many(chatMessages, { relationName: "ChatToChatMessage" }),
  llm: helpers.one(llmInstances, {
    relationName: "ChatToLLMInstance",
    fields: [chats.llmId],
    references: [llmInstances.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, (helpers) => ({
  owner: helpers.one(users, {
    relationName: "ChatMessageToUser",
    fields: [chatMessages.ownerId],
    references: [users.id],
  }),
  parentChat: helpers.one(chats, {
    relationName: "ChatToChatMessage",
    fields: [chatMessages.parentChatId],
    references: [chats.id],
  }),
}));
