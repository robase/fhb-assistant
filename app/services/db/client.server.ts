import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

import "dotenv/config";

export const client = new pg.Client({
  connectionString: process.env.DB_URL,
});

await client.connect();

export const db = drizzle(client, { schema });
