import "dotenv/config";
import { Dataset } from "crawlee";
import { Config, stateConfigs } from "./config";
import { crawl, write } from "./core";
import { contents, documents } from "../../app/services/db/schema";
import { exit } from "process";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { v4 } from "uuid";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import { generateEmbedding } from "../../app/services/embeddings.server";
import OpenAI from "openai";
import { db } from "../../app/services/db/client.server";
import path from "path";
import { resourceExclusions } from "./exclude-list";

// use to manually set an output dir e.g. '2022-01-01'
const OUT_DIR_DATE = undefined;

const openAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function writeFileSyncRecursive(filename, content = "") {
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, content);
}

function getOutputDir() {
  const d = OUT_DIR_DATE || new Date();
  return `outputs/intermediate/${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
}

async function retrieveContent(configList: { state: string; items: { url: string; selector?: string }[] }[]) {
  console.log("Pulling data");
  const scraped: { state: string; files: string[] }[] = [];

  // Run sequentially to avoid playwright out of memory issues
  for (const config of configList) {
    const scrapedDoc: string[] = [];
    let i = 0;
    for (const { url, selector } of config.items) {
      const item: Config = {
        url,
        selector,
        outputFileName: `outputs/${config.state}_${i}.json`,
        maxPagesToCrawl: 200,
        match: `${url}**`,
        resourceExclusions,
        waitForSelectorTimeout: 5000,
        maxTokens: 2000000,
      };
      await crawl(item, config.state);

      scrapedDoc.push(await write(item, config.state));
      i++;
    }

    scraped.push({ state: config.state, files: scrapedDoc });
  }

  const docsByState = scraped.reduce((acc, { state, files }: { state: string | null; files: string[] }) => {
    const contents = files.flatMap((file) => file && JSON.parse(readFileSync(file, "utf-8"))).filter((f) => !!f) as {
      title: string;
      url: string;
      html: string;
    }[];

    contents.forEach((c) => {
      if (state) {
        if (!acc[state]) {
          acc[state] = {};
        }

        if (!(c.url in acc[state])) {
          acc[state][c.url] = c;
        }
      } else {
        if (!acc["all"]) {
          acc["all"] = {};
        }
        if (!(c.url in acc["all"])) {
          acc["all"][c.url] = c;
        }
      }
    });

    return acc;
  }, {} as Record<string, Record<string, { title: string; url: string; html: string }>>);

  writeFileSyncRecursive(`${getOutputDir()}/docsByState.json`, JSON.stringify(docsByState, null, 2));

  return docsByState;
}

async function refineContent(
  docsByState: Record<
    string,
    Record<
      string,
      {
        title: string;
        url: string;
        html: string;
      }
    >
  >
) {
  const out: Record<string, { title: string; url: string; html: string; extractedContent?: string | null }[]> = {};

  for (const [state, docs] of Object.entries(docsByState)) {
    const docOut: { title: string; url: string; html: string; extractedContent?: string | null }[] = [];
    for (const doc of Object.values(docs)) {
      console.log(doc.title);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const openAIResponse = await openAI.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant.",
          },
          {
            role: "user",
            content: `
  - Extract the content of the following web scraped response, returning only the information the page is presenting.
  - Remove any website links or irrelevant text which was included in the original web scrape.
  - Convert any references to 'us' to the name of the entity.
  - Replace references to any commercial entities with generic terms.
  - Remove any contact information.
  - Keep the original content as it was written.

  ${doc.html}`,
          },
        ],
      });

      docOut.push({
        title: doc.title,
        url: doc.url,
        html: doc.html,
        extractedContent: openAIResponse.choices[0].message.content,
      });
    }
    out[state] = docOut;
  }

  writeFileSync(`${getOutputDir()}/docsByStateExtracted.json`, JSON.stringify(out, null, 2));
}

async function dropLocalFiles() {
  await Promise.all(stateConfigs.map(async (c) => (await Dataset.open(c.state)).drop()));
}

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 80,
});

async function splitEmbedPush() {
  const refinedDocsByState = JSON.parse(readFileSync(`${getOutputDir()}/docsByStateExtracted.json`, "utf-8")) as Record<
    string,
    { title: string; url: string; html: string }[]
  >;

  for (const [state, docs] of Object.entries(refinedDocsByState)) {
    const docsToUpload = docs.map(
      (doc: { title: string; url: string; html: string }) =>
        new Document<{ source: string; title: string; state: string; nameSpace: string }>({
          metadata: {
            source: doc.url,
            title: doc.title,
            state: state,
            nameSpace: state,
          },
          pageContent: doc.html,
        })
    );

    const splits = await textSplitter.splitDocuments(docsToUpload);

    await db.transaction(async (tx) => {
      const id = v4();

      await tx
        .insert(documents)
        .values({
          id,
          name: state,
          nameSpace: state,
        })
        .returning();

      if (splits.length > 0) {
        const contentWithEmbeddings = await Promise.all(
          splits.map(async (doc) => ({
            documentId: id,
            name: state,
            metadata: JSON.stringify(doc.metadata), // jsonb column
            pageContent: doc.pageContent,
            embedding: await generateEmbedding(doc.pageContent),
          }))
        );
        await tx.insert(contents).values(contentWithEmbeddings);
      }
    });
  }
}

async function main() {
  await dropLocalFiles();

  const docsByState = await retrieveContent(stateConfigs);

  // const docsByState = JSON.parse(readFileSync(`${docsByStateDir}/docsByState.json`, "utf-8")) as Record<
  //   string,
  //   Record<string, { title: string; url: string; html: string }>
  // >;

  await refineContent(docsByState);

  // TODO: incremental updates rather than full clean and push every time
  await Promise.all([db.delete(documents), db.delete(contents)]);

  await splitEmbedPush();

  console.log("Done ✅");
  
  exit();
}

main();
