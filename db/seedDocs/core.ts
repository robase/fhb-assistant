// For more information, see https://crawlee.dev/
import { Configuration, Dataset, PlaywrightCrawler, downloadListOfUrls } from "crawlee";
import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";
import { Config, configSchema } from "./config.js";
import { Page } from "playwright";
import { isWithinTokenLimit } from "gpt-tokenizer";
import { PathLike } from "fs";

let pageCounter = 0;
let crawler: PlaywrightCrawler;

// Code from GPT Crawler - https://github.com/BuilderIO/gpt-crawler

export function getPageHtml(page: Page, selector = "body") {
  return page.evaluate((selector) => {
    // Check if the selector is an XPath
    if (selector.startsWith("/")) {
      const elements = document.evaluate(selector, document, null, XPathResult.ANY_TYPE, null);
      const result = elements.iterateNext();
      return result ? result.textContent || "" : "";
    } else {
      // Handle as a CSS selector
      const el = document.querySelector(selector) as HTMLElement | null;
      return el?.innerText || "";
    }
  }, selector);
}

export async function waitForXPath(page: Page, xpath: string, timeout: number) {
  await page.waitForFunction(
    (xpath) => {
      const elements = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null);
      return elements.iterateNext() !== null;
    },
    xpath,
    { timeout }
  );
}

export async function crawl(config: Config, state: string) {
  configSchema.parse(config);

  if (process.env.NO_CRAWL !== "true") {
    // PlaywrightCrawler crawls the web using a headless
    // browser controlled by the Playwright library.
    crawler = new PlaywrightCrawler(
      {
        // Use the requestHandler to process each of the crawled pages.
        async requestHandler({ request, page, enqueueLinks, log, pushData }) {
          const title = await page.title();
          pageCounter++;
          log.info(`Crawling: Page ${pageCounter} / ${config.maxPagesToCrawl} - URL: ${request.loadedUrl}...`);

          // Use custom handling for XPath selector
          if (config.selector) {
            if (config.selector.startsWith("/")) {
              await waitForXPath(page, config.selector, config.waitForSelectorTimeout ?? 1000);
            } else {
              await page.waitForSelector(config.selector, {
                timeout: config.waitForSelectorTimeout ?? 1000,
              });
            }
          }

          const html = await getPageHtml(page, config.selector);

          const d = await Dataset.open(state);
          // Save results as JSON to ./storage/datasets/default
          await d.pushData({ title, url: request.loadedUrl, html });

          if (config.onVisitPage) {
            // @ts-expect-error pushData type
            await config.onVisitPage({ page, pushData });
          }

          // Extract links from the current page
          // and add them to the crawling queue.
          await enqueueLinks({
            globs: typeof config.match === "string" ? [config.match] : config.match,
            exclude: typeof config.exclude === "string" ? [config.exclude] : config.exclude ?? [],
          });
        },

        // Comment this option to scrape the full website.
        maxRequestsPerCrawl: config.maxPagesToCrawl,
        // Uncomment this option to see the browser window.
        // headless: false,
        preNavigationHooks: [
          // Abort requests for certain resource types
          async ({ request, page, log }) => {
            // If there are no resource exclusions, return
            const RESOURCE_EXCLUSIONS = config.resourceExclusions ?? [];
            if (RESOURCE_EXCLUSIONS.length === 0) {
              return;
            }
            if (config.cookie) {
              const cookies = (Array.isArray(config.cookie) ? config.cookie : [config.cookie]).map((cookie) => {
                return {
                  name: cookie.name,
                  value: cookie.value,
                  url: request.loadedUrl,
                };
              });
              await page.context().addCookies(cookies);
            }
            await page.route(`**/*.{${RESOURCE_EXCLUSIONS.join()}}`, (route) => route.abort("aborted"));
            log.info(`Aborting requests for as this is a resource excluded route`);
          },
        ],
      },
      new Configuration({
        purgeOnStart: true,
      })
    );

    const isUrlASitemap = /sitemap.*\.xml$/.test(config.url);

    if (isUrlASitemap) {
      const listOfUrls = await downloadListOfUrls({ url: config.url });

      // Add the initial URL to the crawling queue.
      await crawler.addRequests(listOfUrls);

      // Run the crawler
      await crawler.run();
    } else {
      // Add first URL to the queue and start the crawl.
      await crawler.run([config.url]);
    }
  }
}

export async function write(config: Config, state:string) {

  let nextFileNameString: PathLike = "";
  const jsonFiles = await glob(`storage/datasets/${state}/*.json`, {
    absolute: true,
  });

  console.log(`Found ${jsonFiles.length} files to combine...`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let currentResults: Record<string, any>[] = [];
  let currentSize: number = 0;
  let fileCounter: number = 1;
  const maxBytes: number = config.maxFileSize ? config.maxFileSize * 1024 * 1024 : Infinity;

  const getStringByteSize = (str: string): number => Buffer.byteLength(str, "utf-8");

  const nextFileName = (): string => `${config.outputFileName.replace(/\.json$/, "")}-${fileCounter}.json`;

  const writeBatchToFile = async (): Promise<void> => {
    nextFileNameString = nextFileName();
    await writeFile(nextFileNameString, JSON.stringify(currentResults, null, 2));
    console.log(`Wrote ${currentResults.length} items to ${nextFileNameString}`);
    currentResults = [];
    currentSize = 0;
    fileCounter++;
  };

  let estimatedTokens: number = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addContentOrSplit = async (data: Record<string, any>): Promise<void> => {
    const contentString: string = JSON.stringify(data);
    const tokenCount: number | false = isWithinTokenLimit(contentString, config.maxTokens || Infinity);

    if (typeof tokenCount === "number") {
      if (estimatedTokens + tokenCount > config.maxTokens!) {
        // Only write the batch if it's not empty (something to write)
        if (currentResults.length > 0) {
          await writeBatchToFile();
        }
        // Since the addition of a single item exceeded the token limit, halve it.
        estimatedTokens = Math.floor(tokenCount / 2);
        currentResults.push(data);
      } else {
        currentResults.push(data);
        estimatedTokens += tokenCount;
      }
    }

    currentSize += getStringByteSize(contentString);
    if (currentSize > maxBytes) {
      await writeBatchToFile();
    }
  };

  // Iterate over each JSON file and process its contents.
  for (const file of jsonFiles) {
    const fileContent = await readFile(file, "utf-8");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = JSON.parse(fileContent);
    await addContentOrSplit(data);
  }

  // Check if any remaining data needs to be written to a file.
  if (currentResults.length > 0) {
    await writeBatchToFile();
  }

  return nextFileNameString;
}
