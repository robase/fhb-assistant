import 'dotenv/config';

import { db, client } from '../app/services/db/client.server';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

// This will run migrations on the database, skipping the ones already applied
await migrate(db, { migrationsFolder: './db/migrations' });

// Don't forget to close the connection, otherwise the script will hang
await client.end();

console.log("Done");
