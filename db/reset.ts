import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../app/services/db/schema";

const client = new pg.Client({
  connectionString: "postgres://postgres:postgres@localhost:5432",
});

await client.connect();

const db = drizzle(client, { schema });

const query = sql<string>`SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
`;

const tables = await db.execute(query); // retrieve tables

await Promise.all(
  tables.rows.map(async (table) => {
    console.log("💀 Dropping table", table.table_name);
    
    const query = sql.raw(`TRUNCATE TABLE "${table.table_name}" CASCADE;`);
    await db.execute(query); // Truncate (clear all the data) the table
  })
);

await client.end();

console.log("✅ Database emptied");
