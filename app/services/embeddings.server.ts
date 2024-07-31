import OpenAI from "openai";
import { cosineDistance, count, sql, and, eq, or } from "drizzle-orm";
import { db } from "./db/client.server";
import { contents } from "./db/schema";

const openAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbedding(value: string) {
  const input = value.replaceAll("\n", " ");
  const { data } = await openAI.embeddings.create({
    model: "text-embedding-3-small",
    input,
  });
  return data[0].embedding;
}

export async function findSimilarContents(description: string, state: string) {
  const c = await db.select({ count: count() }).from(contents);

  if (!c || c.length === 0 || c[0].count === 0) {
    return [];
  }

  const embedding = await generateEmbedding(description);
  const similarity = sql<number> `1 - (${cosineDistance(contents.embedding, embedding)})`;
  const similarContents = await db
    .select({
      name: contents.name,
      pageContent: contents.pageContent,
      similarity,
    })
    .from(contents)
    .where(and(sql`${similarity} > 0.5`, or(eq(contents.name, state), eq(contents.name, "ALL"))))
    .orderBy((t) => sql`${t.similarity} desc`)
    .limit(5);

  return similarContents;
}